// tests/tutor-handler.test.js
// /api/tutor's handler (server/handler.js), with the fake OpenRouter and the in-memory counter: every state
// (not-configured, locked, recharging, busy, bad-request), the streamed reply and its X-Tutor-Remaining header,
// the request sent to OpenRouter, and logs with no codes, keys or content in them.
import { test } from "node:test";
import assert from "node:assert/strict";
import { handleTutor, OPENROUTER_URL } from "../server/handler.js";
import { memoryCounter } from "../server/counter.js";
import { dailyKey } from "../server/tutor.js";
import { fakeOpenRouter, sseFor, sseError } from "../server/fake-openrouter.js";

const KEY = "sk-or-test-not-a-real-key";
const ENV = { OPENROUTER_API_KEY: KEY, TUTOR_CODES: "maple-42, Comet-7", TUTOR_DAILY_LIMIT: "3" };
const QUESTION = "ZQ why is line one broken QZ", PROGRAM = 'prnt("ZQ-program")';
const ask = (patch = {}) => ({ tutorCode: "maple-42", mode: "hint", task: "Print Hello, World!", program: PROGRAM, output: "", error: "Line 1: NameError",
  feedback: "", hints: ["Use print()"], history: [], question: QUESTION, ...patch });
const post = (body, { type = "application/json", method = "POST" } = {}) =>
  new Request("http://localhost/api/tutor", { method, headers: { "content-type": type }, body: typeof body === "string" ? body : JSON.stringify(body) });
const json = async res => ({ status: res.status, ...(await res.json()) });
// A handler with a scripted OpenRouter, a fresh counter and a log that records everything.
function world(script = "Look at line 1. What does Python call it?", { env = ENV, counter = memoryCounter(), now } = {}) {
  const fetch = fakeOpenRouter(script), logs = [];
  const call = req => handleTutor(req, env, { fetch, counter, log: (...a) => logs.push(a.join(" ")), ...(now && { now }) });
  return { fetch, logs, counter, call };
}

test("GET says whether Byte is set up here: a key and at least one code", async () => {
  assert.deepEqual(await json(await world().call(new Request("http://localhost/api/tutor"))), { status: 200, state: "ready" });
  for (const env of [{ TUTOR_CODES: "a" }, { OPENROUTER_API_KEY: KEY }, { OPENROUTER_API_KEY: KEY, TUTOR_CODES: " , " }])
    assert.deepEqual(await json(await world(undefined, { env }).call(new Request("http://localhost/api/tutor"))), { status: 200, state: "not-configured" });
});

test("not configured: a question gets not-configured and OpenRouter is never called", async () => {
  const w = world(undefined, { env: { TUTOR_CODES: "maple-42" } });
  assert.deepEqual(await json(await w.call(post(ask()))), { status: 503, state: "not-configured" });
  assert.equal(w.fetch.calls.length, 0);
});

test("only a JSON POST: other methods get 405 (so a CORS preflight fails) and other content types 415", async () => {
  for (const method of ["PUT", "DELETE", "OPTIONS"]) assert.equal((await world().call(new Request("http://localhost/api/tutor", { method }))).status, 405, method);
  assert.deepEqual(await json(await world().call(post(ask(), { type: "text/plain" }))), { status: 415, state: "bad-request" });
});

test("bad JSON, a missing field or one over its limit: bad-request, and nothing is counted or sent", async () => {
  const w = world();
  for (const body of ["{not json", ask({ question: "" }), ask({ question: "x".repeat(301) }), ask({ mode: "solve" }), ask({ program: "x".repeat(4001) })])
    assert.deepEqual(await json(await w.call(post(body))), { status: 400, state: "bad-request" });
  assert.equal(w.fetch.calls.length, 0); assert.equal(w.counter.counts.size, 0);
});

test("a wrong code is locked, and costs nothing: no count, no OpenRouter call", async () => {
  const w = world();
  for (const tutorCode of ["maple-4", "dev", "MAPLE-42x"]) assert.deepEqual(await json(await w.call(post(ask({ tutorCode })))), { status: 401, state: "locked" });
  assert.equal(w.fetch.calls.length, 0); assert.equal(w.counter.counts.size, 0);
});

test("a code check answers ready without counting or asking", async () => {
  const w = world();
  assert.deepEqual(await json(await w.call(post({ tutorCode: " comet-7 ", check: true }))), { status: 200, state: "ready" });
  assert.deepEqual(await json(await w.call(post({ tutorCode: "nope", check: true }))), { status: 401, state: "locked" });
  assert.equal(w.fetch.calls.length, 0); assert.equal(w.counter.counts.size, 0);
});

test("a question streams Byte's reply back as plain text, with the questions left today", async () => {
  const reply = "Look at line 1 👀 — is **prnt** how Python spells it?\n\n```python\nprint(\"hi\")\n```";
  const w = world(reply), res = await w.call(post(ask()));
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("content-type"), "text/plain; charset=utf-8"); assert.equal(res.headers.get("cache-control"), "no-store");
  assert.equal(res.headers.get("x-tutor-remaining"), "2");
  assert.equal(await res.text(), reply);
  assert.equal((await w.call(post(ask()))).headers.get("x-tutor-remaining"), "1");
});

test("the request to OpenRouter: the key in the header, the model setting, low-effort hidden reasoning, zero retention, the rules as the system prompt", async () => {
  const w = world();
  await (await w.call(post(ask()))).text();
  const { url, init, body } = w.fetch.calls[0];
  assert.equal(url, OPENROUTER_URL); assert.equal(init.method, "POST");
  assert.equal(init.headers.Authorization, `Bearer ${KEY}`); assert.equal(init.headers["Content-Type"], "application/json");
  assert.equal(body.model, "anthropic/claude-sonnet-5"); assert.equal(body.stream, true); assert.equal(body.max_tokens, 2000);
  assert.deepEqual(body.reasoning, { effort: "low", exclude: true }); assert.deepEqual(body.provider, { data_collection: "deny", zdr: true });
  assert.equal(body.messages[0].role, "system"); assert.match(body.messages[0].content, /Mode: HINT/);
  assert.ok(!body.messages[0].content.includes("ZQ"), "the kid's words aren't in the system prompt");
  assert.ok(body.messages.at(-1).content.includes(QUESTION)); assert.ok(init.signal instanceof AbortSignal);
  const haiku = world(undefined, { env: { ...ENV, TUTOR_MODEL: "anthropic/claude-haiku-4.5" } });
  await (await haiku.call(post(ask({ mode: "open" })))).text();
  assert.equal(haiku.fetch.calls[0].body.model, "anthropic/claude-haiku-4.5"); assert.match(haiku.fetch.calls[0].body.messages[0].content, /Mode: OPEN/);
});

test("over the daily limit: recharging, without asking OpenRouter; other codes and the next UTC day start fresh", async () => {
  let day = new Date("2026-09-26T10:00:00Z");
  const w = world(undefined, { now: () => day });
  for (let i = 0; i < 3; i++) await (await w.call(post(ask()))).text();
  assert.deepEqual(await json(await w.call(post(ask()))), { status: 429, state: "recharging" });
  assert.equal(w.fetch.calls.length, 3);
  assert.equal((await w.call(post(ask({ tutorCode: "comet-7" })))).status, 200);
  day = new Date("2026-09-27T00:30:00Z");
  assert.equal((await w.call(post(ask()))).headers.get("x-tutor-remaining"), "2");
  assert.ok(w.counter.counts.has(dailyKey("maple-42", day)));
});

test("no counter (Upstash not set up) means no cap and no header; a failing counter doesn't stop Byte", async () => {
  const none = world(undefined, { counter: null }), res = await none.call(post(ask()));
  assert.equal(res.status, 200); assert.equal(res.headers.get("x-tutor-remaining"), null); await res.text();
  const broken = world(undefined, { counter: { incr: async () => { throw new Error("upstash http 401: WRONGPASS invalid password"); } } });
  const r2 = await broken.call(post(ask()));
  assert.equal(r2.status, 200); assert.equal(r2.headers.get("x-tutor-remaining"), null); await r2.text();
  assert.match(broken.logs.join("\n"), /counter unavailable/);
});

test("OpenRouter failing before streaming is busy; out of credits (402) is recharging; unreachable is busy", async () => {
  for (const status of [400, 401, 403, 408, 429, 500, 502, 503]) assert.deepEqual(await json(await world({ status }).call(post(ask()))), { status: 502, state: "busy" }, String(status));
  const credits = world({ status: 402, error: { code: 402, message: "Key limit exceeded", metadata: { limit_source: "openrouter_key_limit" } } });
  assert.deepEqual(await json(await credits.call(post(ask()))), { status: 429, state: "recharging" });
  assert.match(credits.logs[0], /402 openrouter_key_limit/);
  const down = handleTutor(post(ask()), ENV, { fetch: async () => { throw new TypeError("fetch failed"); }, log: () => {} });
  assert.deepEqual(await json(await down), { status: 502, state: "busy" });
});

test("an error as the stream's first event, or a stream with no text, is busy; an error after some text breaks off the reply", async () => {
  assert.deepEqual(await json(await world({ sse: ": OPENROUTER PROCESSING\n\n" + sseError(502) }).call(post(ask()))), { status: 502, state: "busy" });
  const lengthOnly = `data: ${JSON.stringify({ choices: [{ delta: { content: "" }, finish_reason: "length" }] })}\n\ndata: [DONE]\n\n`;
  assert.deepEqual(await json(await world({ sse: lengthOnly }).call(post(ask()))), { status: 502, state: "busy" });
  const partial = sseFor("Let me look").replace(/data: \{[^\n]*"stop"[\s\S]*$/, "") + sseError(502, "provider_unavailable");
  const res = await world({ sse: partial }).call(post(ask()));
  assert.equal(res.status, 200);
  const reader = res.body.getReader(), dec = new TextDecoder(); let got = "";
  await assert.rejects(async () => { for (;;) { const { done, value } = await reader.read(); if (done) break; got += dec.decode(value); } });
  assert.equal(got, "Let me look");
});

test("keep-alive comments and lines split one byte at a time still give the whole reply", async () => {
  const reply = "Emoji 🤖 and ünïcode survive — and so does `code`.";
  const fetch = fakeOpenRouter(reply, { size: 1 });
  const res = await handleTutor(post(ask()), ENV, { fetch, counter: memoryCounter(), log: () => {} });
  assert.equal(await res.text(), reply);
});

test("the logs never hold a code, the key, the counter's key, or anything the kid sent", async () => {
  const logs = [], log = (...a) => logs.push(a.join(" "));
  const scripts = [{ status: 503 }, { status: 402, error: { code: 402, message: `quota for ${QUESTION}`, metadata: { limit_source: "openrouter_credits" } } },
    { sse: sseError(403, "content_policy_violation") }, { sse: sseFor("half").replace(/data: \{[^\n]*"stop"[\s\S]*$/, "") + sseError(502) }, "fine"];
  const failing = { incr: async () => { throw new Error("upstash http 401: WRONGPASS invalid password"); } };
  for (const s of scripts) for (const counter of [memoryCounter(), failing]) {
    const res = await handleTutor(post(ask()), ENV, { fetch: fakeOpenRouter(s), counter, log });
    await res.text().catch(() => {});
  }
  await handleTutor(post(ask({ tutorCode: "wrong-code-zq" })), ENV, { fetch: fakeOpenRouter("x"), log });
  const all = logs.join("\n");
  assert.ok(logs.length >= 5, "failures are logged");
  for (const secret of ["maple", "wrong-code-zq", KEY, "ZQ", "prnt", dailyKey("maple-42").split(":")[1], "Print Hello"]) assert.ok(!all.includes(secret), `the logs mention ${secret}`);
});
