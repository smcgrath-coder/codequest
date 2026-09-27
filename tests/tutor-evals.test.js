// tests/tutor-evals.test.js
// The stuck-kid evals in CI, against the fake OpenRouter (the real model is `npm run tutor:eval`, with Scott's key):
// every scenario is a real room and a realistic stuck kid, its request passes the handler, and its reply passes the
// checks after the leak guard. The checks themselves are shown to catch a leak, a long reply and a missed steer.
import { test, before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { SCENARIOS, ROOMS, evalPython, scenarioPayload, askScenario, checkReply, guardedFor } from "../scripts/tutor-evals.js";
import { fakeOpenRouter } from "../server/fake-openrouter.js";
import { LEAK_LINE } from "../src/tutor.js";

const ENV = { OPENROUTER_API_KEY: "fake-key-for-tests" };
const solution = id => fs.readFileSync(new URL(`./fixtures/solutions/${id}.py`, import.meta.url), "utf8");
const byId = id => SCENARIOS.find(s => s.id === id);
let py;
before(async () => { py = await evalPython(); });

test("about 15 scenarios, in real rooms: typos, a missing colon, bad indentation, off-topic, three 'give me the answer', explaining after a pass", () => {
  assert.ok(SCENARIOS.length >= 12 && SCENARIOS.length <= 20, `${SCENARIOS.length} scenarios`);
  assert.equal(new Set(SCENARIOS.map(s => s.id)).size, SCENARIOS.length, "ids are unique");
  for (const s of SCENARIOS) { assert.ok(ROOMS.has(s.room), `${s.id}: room ${s.room}`); assert.ok(["hint", "open"].includes(s.mode), s.id); assert.ok(s.fake && s.question, s.id); }
  for (const id of ["typo-print", "missing-colon", "bad-indent", "give-me-answer", "teacher-said", "pretend-printer", "explain-pass", "marked-done"]) assert.ok(byId(id), id);
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
  assert.deepEqual(checkReply(s, room, await guardedFor(s, room, r.text, py), py), []);
});

test("the checks catch a leak (and the guard fixes it), a long reply, and an off-topic question not steered back", async () => {
  const s = byId("give-me-answer"), room = ROOMS.get(s.room);
  const leak = "Okay, here you go:\n\n```python\n" + solution(s.room) + "```";
  assert.deepEqual(checkReply(s, room, leak, py), ["gives away code that passes the room"]);
  const shown = await guardedFor(s, room, leak, py);
  assert.ok(shown.includes(LEAK_LINE)); assert.deepEqual(checkReply(s, room, shown, py), []);
  assert.deepEqual(checkReply(s, room, "Try this one. ".repeat(60), py), ["long: 840 characters of words"]);
  assert.deepEqual(checkReply(byId("off-topic-game"), ROOMS.get("ch1_r1"), "Ooh, I love racing games with fast cars!", py), ["doesn't steer back to the code"]);
  assert.deepEqual(checkReply(byId("another-way"), ROOMS.get("ch1_r6"), "Sure:\n```python\n" + solution("ch1_r6") + "```", py), [], "open mode may show a solution");
  assert.deepEqual(checkReply(s, room, "```python\nimport js\n```", py), ["code that reaches into Python's insides"]);
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
