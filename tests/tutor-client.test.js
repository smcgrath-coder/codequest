// tests/tutor-client.test.js
// Byte on the game's side (src/tutor.js): when Byte is offered and in which mode, the remembered tutor code, the
// payload (it passes the server's own checks), reading the streamed reply and every state, and how replies show.
import { test } from "node:test";
import assert from "node:assert/strict";
import { shouldOfferTutor, tutorMode, loadTutorCode, saveTutorCode, forgetTutorCode, TUTOR_CODE_KEY, onTutorState, TUTOR_SAYS,
  historyFor, tutorPayload, probeTutor, checkTutorCode, askTutor, replyParts, hideCode, LIMITS, asked, replyPending, dropReply, spoken } from "../src/tutor.js";
import { validateRequest } from "../server/tutor.js";
import { CHAPTERS } from "../src/content.js";

const store = m => ({ getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: k => m.delete(k) });
const blocked = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); }, removeItem() { throw new Error("blocked"); } };
// A fetch that records its calls and answers with the Response `make()` builds (or throws, for offline).
const fakeFetch = make => { const calls = []; const f = async (url, init = {}) => { calls.push({ url, init }); return make(init); }; f.calls = calls; return f; };
const textStream = (pieces, { breakAfter } = {}) => new ReadableStream({ start(c) { const enc = new TextEncoder(); pieces.forEach(p => c.enqueue(enc.encode(p))); breakAfter ? c.error(new Error("broke")) : c.close(); } });
const reply = (pieces, headers = {}, opts) => new Response(textStream(pieces, opts), { headers: { "content-type": "text/plain; charset=utf-8", ...headers } });
const room = CHAPTERS[0].rooms[0];

test("in a room Byte comes after the last hint; on the victory screen always; anywhere else never", () => {
  assert.equal(shouldOfferTutor("room", 0, 2), false); assert.equal(shouldOfferTutor("room", 1, 2), false);
  assert.equal(shouldOfferTutor("room", 2, 2), true); assert.equal(shouldOfferTutor("room", 1, 1), true);
  assert.equal(shouldOfferTutor("room", 0, 0), false, "no hints, no Byte");
  assert.equal(shouldOfferTutor("victory", 0, 2), true);
  assert.equal(shouldOfferTutor("practice", 5, 0), false); assert.equal(shouldOfferTutor(undefined, 2, 2), false);
});

test("every room and boss has a hint, so each gets its 'after the last hint' moment", () => {
  for (const c of CHAPTERS.flatMap(ch => [...ch.rooms, ch.boss])) assert.ok(c.hints.length >= 1, c.id);
});

test("open mode only on the victory screen after a real pass; Mark it done and the room itself stay in hint mode", () => {
  assert.equal(tutorMode("victory", true, false), "open");
  assert.equal(tutorMode("victory", true, true), "hint");
  assert.equal(tutorMode("room", true, false), "hint"); assert.equal(tutorMode("room", false, false), "hint");
});

test("the tutor code is remembered on this device, trimmed; blocked storage just forgets", () => {
  const m = new Map(), s = store(m);
  assert.equal(loadTutorCode(s), "");
  saveTutorCode("  maple-42 ", s); assert.equal(m.get(TUTOR_CODE_KEY), "maple-42"); assert.equal(loadTutorCode(s), "maple-42");
  forgetTutorCode(s); assert.equal(m.has(TUTOR_CODE_KEY), false);
  assert.equal(loadTutorCode(blocked), ""); assert.doesNotThrow(() => saveTutorCode("x", blocked)); assert.doesNotThrow(() => forgetTutorCode(blocked));
  assert.equal(loadTutorCode(undefined), "", "node has no localStorage");
  assert.equal(TUTOR_CODE_KEY, "cq:tutor-code");
});

test("a locked answer forgets the saved code and asks for it again; the others just say why", () => {
  const m = new Map([[TUTOR_CODE_KEY, "old-code"]]);
  assert.deepEqual(onTutorState("locked", store(m)), { say: TUTOR_SAYS.locked, tone: "err", needCode: true });
  assert.equal(m.has(TUTOR_CODE_KEY), false);
  assert.equal(onTutorState("recharging", store(m)).say, "I need to recharge — let's try again tomorrow!");
  assert.equal(TUTOR_SAYS.locked, "That code doesn't work — ask your grown-up for one.");
  for (const s of ["recharging", "busy", "offline", "not-configured", "bad-request"]) assert.equal(onTutorState(s, store(m)).needCode, false, s);
  assert.equal(onTutorState("something-new").say, TUTOR_SAYS.busy);
});

test("the chat: a question goes out with its reply on the way; a reply that doesn't come goes, and its question is marked failed", () => {
  const chat = asked([{ id: "0q", role: "user", content: "hi" }, { id: "0", role: "assistant", content: "hello" }], "1", "why?");
  assert.deepEqual(chat.slice(2), [{ id: "1q", role: "user", content: "why?" }, { id: "1", role: "assistant", content: "", pending: true }]);
  assert.equal(replyPending(chat), true); assert.equal(replyPending(chat.slice(0, 3)), false); assert.equal(replyPending([]), false);
  const dropped = dropReply(chat, "1");
  assert.deepEqual(dropped, [...chat.slice(0, 2), { id: "1q", role: "user", content: "why?", failed: true }]);
  assert.equal(replyPending(dropped), false);
  assert.deepEqual(historyFor(dropped).map(m => m.content), ["hi", "hello"], "out of the history");
  assert.deepEqual(dropReply(dropped, "1"), dropped, "twice is the same as once");
  assert.deepEqual(dropReply(chat, "0"), [{ id: "0q", role: "user", content: "hi", failed: true }, ...chat.slice(2)], "only that reply and its question");
});

test("the history: whole pairs of a question and its answer, the last six messages", () => {
  const chat = [{ role: "user", content: "q1" }, { role: "assistant", content: "a1" }, { role: "user", content: "q2", failed: true },
    { role: "user", content: "q3" }, { role: "assistant", content: "a3" }, { role: "user", content: "q4" }, { role: "assistant", content: "a4" },
    { role: "user", content: "q5" }, { role: "assistant", content: "a5" }, { role: "user", content: "q6" }, { role: "assistant", content: "", pending: true }];
  assert.deepEqual(historyFor(chat).map(m => m.content), ["q3", "a3", "q4", "a4", "q5", "a5"]);
  assert.deepEqual(historyFor(chat.slice(0, 4)).map(m => m.content), ["q1", "a1"], "a question with no answer yet is left out");
  assert.deepEqual(historyFor([{ role: "assistant", content: "x" }, { role: "user", content: "q" }, { role: "assistant", content: "y".repeat(2000) }]).map(m => m.content.length), [1, LIMITS.turn]);
  assert.ok(validateRequest({ tutorCode: "c", mode: "hint", task: "t", program: "", question: "q", history: historyFor(chat) }), "the server accepts it");
});

test("the payload: the room, the code and its last run, the hints shown and the chat, clipped so the server accepts it", () => {
  const huge = "x".repeat(10000);
  const result = { error: { headline: "Line 1: Python doesn't know prnt.", python: "NameError: name 'prnt' is not defined" }, feedback: huge };
  const p = tutorPayload({ tutorCode: " maple-42 ", mode: "hint", challenge: room, program: 'prnt("Hello, World!")', lastRunCode: 'prnt("Hello")', result,
    parts: [{ kind: "stdout", text: huge }], hintLevel: 2, chat: [{ role: "user", content: "hi" }, { role: "assistant", content: "hello" }], question: "  why? " });
  assert.deepEqual(Object.keys(p).sort(), ["edited", "error", "feedback", "hints", "history", "mode", "output", "program", "question", "task", "tutorCode"]);
  assert.equal(p.tutorCode, "maple-42"); assert.equal(p.task, room.task); assert.equal(p.question, "why?"); assert.equal(p.edited, true);
  assert.deepEqual(p.hints, room.hints.slice(0, 2)); assert.match(p.error, /prnt\.\nNameError/);
  assert.equal(p.output.length, LIMITS.output); assert.equal(p.feedback.length, LIMITS.feedback);
  assert.ok(validateRequest(p), "the server accepts it");
  const fresh = tutorPayload({ tutorCode: "c", mode: "open", challenge: room, program: "print(1)", question: "how?" });
  assert.equal(fresh.edited, false); assert.deepEqual(fresh.hints, []); assert.equal(fresh.output, ""); assert.equal(fresh.error, ""); assert.equal(fresh.feedback, "");
  assert.ok(validateRequest(fresh));
  // The keyword checker's words are the error only where OUTPUT shows them: when there was no Python to run the code.
  const kw = mode => tutorPayload({ tutorCode: "c", mode: "hint", challenge: room, program: "x", result: { mode, keywordError: "Use print()" }, question: "q" }).error;
  assert.equal(kw("fallback"), "Use print()");
  assert.equal(kw("python"), "", "a clean run the grader rejected has no error");
});

test("askTutor posts JSON to /api/tutor and streams the reply as it comes, with the questions left", async () => {
  const fetch = fakeFetch(() => reply(["Look at ", "line 1 👀", " please."], { "x-tutor-remaining": "7" }));
  const seen = [], r = await askTutor({ question: "why?" }, { fetch, onText: t => seen.push(t) });
  assert.deepEqual(r, { state: "ok", text: "Look at line 1 👀 please.", remaining: 7 });
  assert.deepEqual(seen, ["Look at ", "Look at line 1 👀", "Look at line 1 👀 please."]);
  assert.equal(fetch.calls[0].url, "/api/tutor"); assert.equal(fetch.calls[0].init.method, "POST");
  assert.equal(fetch.calls[0].init.headers["content-type"], "application/json"); assert.deepEqual(JSON.parse(fetch.calls[0].init.body), { question: "why?" });
  assert.equal((await askTutor({}, { fetch: fakeFetch(() => reply(["hi"])) })).remaining, null, "no header: uncapped");
});

test("askTutor maps every other answer to a state", async () => {
  const j = (state, status) => () => Response.json({ state }, { status });
  for (const [make, want] of [[j("locked", 401), "locked"], [j("recharging", 429), "recharging"], [j("busy", 502), "busy"], [j("not-configured", 503), "not-configured"],
    [j("bad-request", 400), "bad-request"], [() => new Response("<!doctype html>", { status: 404, headers: { "content-type": "text/html" } }), "not-configured"],
    [() => new Response("<!doctype html>", { status: 200, headers: { "content-type": "text/html" } }), "not-configured"],
    [() => new Response("An error occurred", { status: 504, headers: { "content-type": "text/plain" } }), "busy"],
    [() => Response.json({ what: 1 }, { status: 500 }), "busy"], [() => reply(["Let me"], {}, { breakAfter: true }), "busy"], [() => reply([" \n"]), "busy"],
    [() => { throw new TypeError("Failed to fetch"); }, "offline"]])
    assert.equal((await askTutor({}, { fetch: fakeFetch(make) })).state, want);
  const ac = new AbortController(); ac.abort();
  assert.equal((await askTutor({}, { fetch: fakeFetch(() => { throw new DOMException("aborted", "AbortError"); }), signal: ac.signal })).state, "stopped");
});

test("askTutor never throws: a reply with no body, or one that can't be read, is busy (or stopped)", async () => {
  const locked = () => { const r = reply(["hi"]); r.body.getReader(); return r; };   // a second reader throws
  for (const make of [() => new Response(null, { headers: { "content-type": "text/plain" } }), locked])
    assert.deepEqual(await askTutor({}, { fetch: fakeFetch(make) }), { state: "busy" });
  const ac = new AbortController(); ac.abort();
  assert.deepEqual(await askTutor({}, { fetch: fakeFetch(locked), signal: ac.signal }), { state: "stopped" });
});

test("checking a code sends it with check: true; probing asks with GET whether Byte is set up here", async () => {
  const fetch = fakeFetch(init => Response.json({ state: JSON.parse(init.body).tutorCode === "maple-42" ? "ready" : "locked" }, { status: 200 }));
  assert.equal(await checkTutorCode(" maple-42 ", { fetch }), "ready"); assert.equal(await checkTutorCode("nope", { fetch }), "locked");
  assert.deepEqual(JSON.parse(fetch.calls[0].init.body), { tutorCode: "maple-42", check: true });
  assert.equal(await checkTutorCode("x", { fetch: fakeFetch(() => { throw new TypeError("offline"); }) }), "offline");
  for (const [make, want] of [[() => Response.json({ state: "ready" }), "ready"], [() => Response.json({ state: "ready", dailyCap: false }), "ready"], [() => Response.json({ state: "not-configured" }), "not-configured"],
    [() => new Response("<!doctype html>", { headers: { "content-type": "text/html" } }), "not-configured"], [() => new Response("", { status: 404 }), "not-configured"],
    [() => new Response("oops", { status: 500 }), "offline"], [() => { throw new TypeError("offline"); }, "offline"]]) {
    const f = fakeFetch(make); assert.equal(await probeTutor({ fetch: f }), want); assert.equal(f.calls[0].init.method, "GET");
  }
});

test("a reply shows as words and code panels; while a hint streams, its code stays hidden", () => {
  assert.deepEqual(replyParts("Look here:\n\n```python\nprint(\"hi\")\n```\n\nSee?"), [{ kind: "text", text: "Look here:" }, { kind: "code", text: 'print("hi")' }, { kind: "text", text: "See?" }]);
  assert.deepEqual(replyParts("```print(1)```"), [{ kind: "code", text: "print(1)" }]);
  assert.deepEqual(replyParts("Cut off:\n```python\nx = 1\n"), [{ kind: "text", text: "Cut off:" }, { kind: "code", text: "x = 1" }]);
  assert.deepEqual(replyParts("Just words."), [{ kind: "text", text: "Just words." }]);
  assert.equal(hideCode("Try `print(1)` like\n```python\nprint(2)\n```\nok"), "Try ⌛ like\n\n⌛\n\nok");
  assert.equal(hideCode("Almost: ```python\nprint(\"Hel"), "Almost: \n⌛\n");
  assert.equal(hideCode("half `pri"), "half ⌛"); assert.equal(hideCode("no code here"), "no code here");
});

test("a finished reply for a screen reader: its words and code as plain text, without the backticks", () => {
  assert.equal(spoken("Look here:\n\n```python\nprint(\"hi\")\n```\n\nThen try `x = 1`."), 'Look here:\nprint("hi")\nThen try x = 1.');
  assert.equal(spoken("Just words."), "Just words.");
});

test("a code block opens with 3 or more backticks and anything on that line, and closes with the same backticks", () => {
  for (const open of ["```python ", "``` py", "```Python3", "```", "````python"])
    assert.deepEqual(replyParts(`See:\n${open}\nx = 1\n${open.match(/^`+/)[0]}\nok`), [{ kind: "text", text: "See:" }, { kind: "code", text: "x = 1" }, { kind: "text", text: "ok" }], open);
  assert.deepEqual(replyParts("````\n```\nx = 1\n```\n````"), [{ kind: "code", text: "```\nx = 1\n```" }], "three backticks inside four");
  assert.equal(hideCode("See:\n````python\nx = 1\n```\nstill code"), "See:\n\n⌛\n", "a four-backtick block isn't closed by three");
});
