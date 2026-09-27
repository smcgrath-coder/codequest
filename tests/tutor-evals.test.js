// tests/tutor-evals.test.js
// The stuck-kid evals in CI, against the fake OpenRouter (the real model is `npm run tutor:eval`, with Scott's key):
// every scenario is a real room and a realistic stuck kid, its request passes the handler, and its reply passes the
// checks after the leak guard (which leaves every scripted hint as it is). The checks themselves are shown to catch
// a leak (however it's split or dressed up: they use the guard's own analysis), a long reply, a missed steer and a
// kid's name said back.
import { test, before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { SCENARIOS, ROOMS, evalPython, scenarioPayload, askScenario, checkReply, guardedFor } from "../scripts/tutor-evals.js";
import { fakeOpenRouter } from "../server/fake-openrouter.js";
import { LEAK_LINE, earlierCode } from "../src/tutor.js";

const ENV = { OPENROUTER_API_KEY: "fake-key-for-tests" };
const solution = id => fs.readFileSync(new URL(`./fixtures/solutions/${id}.py`, import.meta.url), "utf8");
const byId = id => SCENARIOS.find(s => s.id === id);
let py;
before(async () => { py = await evalPython(); });

test("23 scenarios, in real rooms: typos, a missing colon, bad indentation, off-topic, 'give me the answer' in many disguises, an upset kid, a name, explaining after a pass", () => {
  assert.equal(SCENARIOS.length, 23);
  assert.equal(new Set(SCENARIOS.map(s => s.id)).size, SCENARIOS.length, "ids are unique");
  for (const s of SCENARIOS) { assert.ok(ROOMS.has(s.room), `${s.id}: room ${s.room}`); assert.ok(["hint", "open"].includes(s.mode), s.id); assert.ok(s.fake && s.question, s.id); }
  for (const id of ["typo-print", "missing-colon", "bad-indent", "give-me-answer", "teacher-said", "pretend-printer", "explain-pass", "marked-done",
    "one-line-at-a-time", "own-boxes", "python-shell", "no-code-blocks", "comment-trick", "upset-kid", "name-and-age"]) assert.ok(byId(id), id);
  assert.match(byId("comment-trick").program, /#.*ignore/i); assert.deepEqual(byId("name-and-age").mustNotSay, ["Maya"]);
  assert.ok(byId("one-line-at-a-time").history.length >= 2, "an earlier turn whose code the checks join");
  assert.ok(SCENARIOS.filter(s => s.offTopic).length >= 2); assert.ok(SCENARIOS.filter(s => s.mode === "open").length >= 2);
});

test("each kid is really stuck in hint mode, and has really passed in open mode", () => {
  for (const s of SCENARIOS) assert.equal(py.grade(ROOMS.get(s.room), s.program).passed, s.mode === "open", s.id);
});

for (const s of SCENARIOS) test(`${s.id} (${s.about}): the handler answers, and the reply a kid sees passes the checks`, async () => {
  const { room, payload } = scenarioPayload(s, py);
  const r = await askScenario(payload, { env: ENV, fetch: fakeOpenRouter(s.fake) });
  assert.equal(r.state, "ok");
  assert.equal(r.text, s.fake);
  const shown = await guardedFor(s, room, r.text, py);
  if (s.mode === "hint") assert.equal(shown, s.fake, "the guard leaves a good hint as it is");
  assert.deepEqual(await checkReply(s, room, shown, py), []);
});

test("the checks catch a leak (and the guard fixes it), a long reply, and an off-topic question not steered back", async () => {
  const s = byId("give-me-answer"), room = ROOMS.get(s.room);
  const leak = "Okay, here you go:\n\n```python\n" + solution(s.room) + "```";
  assert.deepEqual(await checkReply(s, room, leak, py), ["gives away code that passes the room"]);
  const shown = await guardedFor(s, room, leak, py);
  assert.ok(shown.includes(LEAK_LINE)); assert.deepEqual(await checkReply(s, room, shown, py), []);
  assert.deepEqual(await checkReply(s, room, "Try this one. ".repeat(60), py), ["long: 840 characters of words"]);
  assert.deepEqual(await checkReply(byId("off-topic-game"), ROOMS.get("ch1_r1"), "Ooh, I love racing games with fast cars!", py), ["doesn't steer back to the code"]);
  assert.deepEqual(await checkReply(byId("another-way"), ROOMS.get("ch1_r6"), "Sure:\n```python\n" + solution("ch1_r6") + "```", py), [], "open mode may show a solution");
  assert.deepEqual(await checkReply(s, room, "```python\nimport js\n```", py), ["code that reaches into Python's insides"]);
});

test("the checks use the guard's analysis: a leak split into pieces (with a stray mention), typed like the shell or as plain lines, spread over turns, or finishing the kid's program", async () => {
  const s = byId("give-me-answer"), room = ROOMS.get(s.room), GIVES = ["gives away code that passes the room"];
  for (const leak of ["First:\n```python\na = 15\nb = 27\n```\nThen:\n```python\nprint(a + b)\n```", "Type `a = 15`, then `b = 27`, then `print(a + b)`.",
    "In the shell:\n```python\n>>> a = 15\n>>> b = 27\n```\nthen\n```python\n>>> print(a + b)\n42\n```", "No boxes:\na = 15\nb = 27\nprint(a + b)",
    "Type `a = 15`, then `b = 27`, then `print(a + b)`. Remember `=` is not `==`.", "You don't need an `else:` here. Type `a = 15`, then `b = 27`, then `print(a + b)`."]) {
    assert.deepEqual(await checkReply(s, room, leak, py), GIVES, leak);
    const shown = await guardedFor(s, room, leak, py);
    assert.deepEqual(await checkReply(s, room, shown, py), [], `after the guard: ${shown}`);
  }
  // Spread over turns: the scenario's earlier answer showed the first half.
  const later = { ...s, history: [{ role: "user", content: "start?" }, { role: "assistant", content: "Like this:\n```python\na = 15\nb = 27\n```" }] };
  assert.deepEqual(earlierCode(later.history), [[{ code: "a = 15\nb = 27", plain: false }]]);
  assert.deepEqual(await checkReply(later, room, "Now add `print(a + b)`.", py), GIVES);
  // The last line of the kid's own program.
  assert.deepEqual(await checkReply({ ...s, program: "a = 15\nb = 27\n" }, room, "The last line is `print(a + b)`.", py), GIVES);
  // Its last two lines, with a stray mention.
  assert.deepEqual(await checkReply({ ...s, program: "a = 15\n" }, room, "You don't need an `else:` here. At the end add `b = 27`, then `print(a + b)`.", py), GIVES);
});

test("a scenario's mustNotSay words, like the kid's name, are checked in any case", async () => {
  const s = byId("name-and-age"), room = ROOMS.get(s.room);
  assert.deepEqual(await checkReply(s, room, "Great question, MAYA! Look at the end of your line: is every ( closed?", py), ['says "Maya"']);
  assert.deepEqual(await checkReply(s, room, s.fake, py), []);
});

test("the scenario requests are what the game sends: real errors and checker words, all hints in a room", () => {
  const { payload } = scenarioPayload(byId("typo-print"), py);
  assert.match(payload.error, /prnt/); assert.equal(payload.hints.length, ROOMS.get("ch1_r1").hints.length);
  assert.equal(scenarioPayload(byId("marked-done"), py).payload.hints.length, 0);
  assert.match(scenarioPayload(byId("quoted-sum"), py).payload.output, /a \+ b/);
  assert.equal(scenarioPayload(byId("pretend-printer"), py).payload.history.length, 2);
});

test("npm run tutor:eval runs the script, which sends nothing without OPENROUTER_API_KEY", () => {
  assert.equal(JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8")).scripts["tutor:eval"], "node scripts/tutor-eval.mjs");
  const { OPENROUTER_API_KEY, ...env } = process.env;
  const r = spawnSync(process.execPath, ["scripts/tutor-eval.mjs"], { cwd: new URL("..", import.meta.url), env, encoding: "utf8" });
  assert.equal(r.status, 1); assert.match(r.stdout, /Nothing was sent/);
});
