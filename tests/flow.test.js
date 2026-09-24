import { test } from "node:test";
import assert from "node:assert/strict";
import { runAndGrade } from "../src/python/flow.js";

const challenge = { id: "ch1_r1", starterCode: "# Type your code below\n" };
const rule = { output: [{ expr: "lines(['Hello, World!'])" }] };
const fallbackGrade = () => ({ passes: true, feedback: "keyword ok", error: null });
const fakeRunner = (run, graded) => ({
  available: () => true,
  run: async () => run,
  grade: async (code, opts) => ({ ...graded, opts }),
});

test("a clean run is graded with the recorded inputs and the attempt number", async () => {
  const r = await runAndGrade({ code: "print(1)", challenge, rule, attempt: 2, fallbackGrade,
    runner: fakeRunner({ ok: true, stdout: "1\n", inputs: ["Alex"] }, { passed: true, feedback: "Great work!" }) });
  assert.equal(r.mode, "python"); assert.equal(r.passes, true); assert.equal(r.feedback, "Great work!");
  assert.deepEqual(r.graded.opts, { rule, starter: challenge.starterCode, inputs: ["Alex"], attempt: 2 });
});

test("the kid's output and input() requests reach the runner", async () => {
  const onOutput = () => {}, onInputRequest = () => {};
  let seen;
  const runner = { ...fakeRunner(), run: async (code, opts) => { seen = { code, ...opts }; return { ok: true, inputs: [] }; } };
  await runAndGrade({ code: "print(1)", challenge, rule, attempt: 1, fallbackGrade, runner, onOutput, onInputRequest });
  assert.deepEqual(seen, { code: "print(1)", onOutput, onInputRequest });
});

test("a crash is explained and not graded", async () => {
  let graded = false;
  const runner = { available: () => true, run: async () => ({ ok: false, kind: "ZeroDivisionError", line: 1, text: "ZeroDivisionError: division by zero" }), grade: async () => { graded = true; } };
  const r = await runAndGrade({ code: "print(1/0)", challenge, rule, attempt: 1, fallbackGrade, runner });
  assert.equal(r.passes, false); assert.match(r.error.headline, /divides by zero/); assert.equal(graded, false);
});

test("a stopped run is not graded", async () => {
  const r = await runAndGrade({ code: "while True: pass", challenge, rule, attempt: 1, fallbackGrade,
    runner: fakeRunner({ ok: false, kind: "Stopped", stopped: true }, {}) });
  assert.equal(r.passes, false); assert.match(r.error.headline, /stopped/); assert.equal(r.graded, undefined);
});

test("when Python is unavailable, the keyword grader is used", async () => {
  const r = await runAndGrade({ code: "print(1)", challenge, rule, attempt: 1, fallbackGrade, runner: { available: () => false } });
  assert.equal(r.mode, "fallback"); assert.equal(r.passes, true); assert.equal(r.feedback, "keyword ok");
});

test("if Python fails to load mid-way, the keyword grader is used", async () => {
  const runner = { available: () => true, run: async () => { throw new Error("load failed"); } };
  const r = await runAndGrade({ code: "print(1)", challenge, rule, attempt: 1, fallbackGrade, runner });
  assert.equal(r.mode, "fallback");
});

test("if grading can't reach Python after the run, the keyword grader grades it", async () => {
  const runner = { ...fakeRunner({ ok: true, inputs: [] }, {}), grade: async () => { throw new Error("load failed"); } };
  const r = await runAndGrade({ code: "print(1)", challenge, rule, attempt: 1, fallbackGrade, runner });
  assert.equal(r.mode, "python"); assert.equal(r.passes, true); assert.equal(r.feedback, "keyword ok");
});

test("a challenge without a rule uses the keyword grader after running", async () => {
  const r = await runAndGrade({ code: "print(1)", challenge, rule: undefined, attempt: 1, fallbackGrade,
    runner: fakeRunner({ ok: true, stdout: "1\n", inputs: [] }, {}) });
  assert.equal(r.mode, "python"); assert.equal(r.feedback, "keyword ok");
});

test("the keyword grader gets the number of earlier attempts, as the rooms pass it today", async () => {
  const counts = [];
  const counting = (code, ch, earlier) => { counts.push(earlier); return { passes: false, feedback: "no", error: "missing quote" }; };
  const r = await runAndGrade({ code: "print(1)", challenge, rule, attempt: 3, fallbackGrade: counting, runner: { available: () => false } });
  await runAndGrade({ code: "print(1)", challenge, rule: undefined, attempt: 1, fallbackGrade: counting, runner: fakeRunner({ ok: true, inputs: [] }, {}) });
  assert.deepEqual(counts, [2, 0]); assert.equal(r.keywordError, "missing quote");
});
