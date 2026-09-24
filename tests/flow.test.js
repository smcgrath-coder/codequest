import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { runAndGrade, countsAsStuck } from "../src/python/flow.js";

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

test("onGrading is called once, after the run and just before the hidden grading pass", async () => {
  const events = [];
  const runner = { available: () => true,
    run: async () => { events.push("run"); return { ok: true, inputs: [] }; },
    grade: async () => { events.push("grade"); return { passed: true, feedback: "Great work!" }; } };
  await runAndGrade({ code: "print(1)", challenge, rule, attempt: 1, fallbackGrade, runner, onGrading: () => events.push("grading") });
  assert.deepEqual(events, ["run", "grading", "grade"]);
});

test("onGrading is never called when nothing is graded", async () => {
  const cases = {
    crash: { rule, runner: fakeRunner({ ok: false, kind: "ZeroDivisionError", line: 1, text: "ZeroDivisionError: division by zero" }, {}) },
    stop: { rule, runner: fakeRunner({ ok: false, kind: "Stopped", stopped: true }, {}) },
    unavailable: { rule, runner: { available: () => false } },
    "load failure": { rule, runner: { available: () => true, run: async () => { throw new Error("load failed"); } } },
    "no rule": { rule: undefined, runner: fakeRunner({ ok: true, inputs: [] }, {}) },
  };
  for (const [name, { rule, runner }] of Object.entries(cases)) {
    let called = 0;
    await runAndGrade({ code: "print(1)", challenge, rule, attempt: 1, fallbackGrade, runner, onGrading: () => called++ });
    assert.equal(called, 0, name);
  }
});

describe("stuck attempts (they unlock the Mark it done button)", () => {
  const clean = { ok: true, inputs: [] };
  const run = (runner, extra = {}) => runAndGrade({ code: "print(1)", challenge, rule, attempt: 1, fallbackGrade, runner, ...extra });

  test("a clean Python run that the grader rejects is stuck", async () => {
    assert.equal(countsAsStuck(await run(fakeRunner(clean, { passed: false, feedback: "Not quite" }))), true);
  });

  test("a clean Python run that passes is not stuck", async () => {
    assert.equal(countsAsStuck(await run(fakeRunner(clean, { passed: true, feedback: "Great work!" }))), false);
  });

  test("a crash is not stuck: the kid has a real error to fix", async () => {
    const crash = { ok: false, kind: "ZeroDivisionError", line: 1, text: "ZeroDivisionError: division by zero" };
    assert.equal(countsAsStuck(await run(fakeRunner(crash, {}))), false);
  });

  test("a run the kid stopped is not stuck", async () => {
    assert.equal(countsAsStuck(await run(fakeRunner({ ok: false, kind: "Stopped", stopped: true }, {}))), false);
  });

  test("a clean Python run graded by the keyword grader (no rule, or grading failed) is stuck when it fails", async () => {
    const failing = () => ({ passes: false, feedback: "no", error: null });
    assert.equal(countsAsStuck(await run(fakeRunner(clean, {}), { rule: undefined, fallbackGrade: failing })), true);
    const noGrade = { ...fakeRunner(clean, {}), grade: async () => { throw new Error("load failed"); } };
    assert.equal(countsAsStuck(await run(noGrade, { fallbackGrade: failing })), true);
  });

  test("without Python, a keyword-grader miss with no keyword error is stuck", async () => {
    const failing = () => ({ passes: false, feedback: "Close! Check the spelling.", error: null });
    assert.equal(countsAsStuck(await run({ available: () => false }, { fallbackGrade: failing })), true);
  });

  test("without Python, a keyword error (the checker found a mistake) is not stuck", async () => {
    const mistake = () => ({ passes: false, feedback: "no", error: "missing quote" });
    assert.equal(countsAsStuck(await run({ available: () => false }, { fallbackGrade: mistake })), false);
  });

  test("without Python, a keyword-grader pass is not stuck", async () => {
    assert.equal(countsAsStuck(await run({ available: () => false })), false);
  });

  test("no result yet is not stuck", () => {
    assert.equal(countsAsStuck(null), false);
    assert.equal(countsAsStuck(undefined), false);
  });

  // Unchanged or empty code can't be a correct answer the grader got wrong, so it never unlocks the button.
  const rejected = { mode: "python", passes: false, run: { ok: true } };
  const starter = "name = \"Alex\"\n# Print a greeting below\n";

  test("running the untouched starter code is not stuck", () => {
    assert.equal(countsAsStuck(rejected, { code: starter, starter }), false);
  });

  test("the starter with only blank lines, comments or spaces changed is still untouched", () => {
    assert.equal(countsAsStuck(rejected, { code: "name = \"Alex\"   \n\n# my idea\n", starter }), false);
  });

  test("code that is empty or only comments is not stuck", () => {
    assert.equal(countsAsStuck(rejected, { code: "", starter }), false);
    assert.equal(countsAsStuck(rejected, { code: "# Type your code below\n\n  # still thinking\n", starter }), false);
  });

  test("the kid's own code on top of the starter is stuck", () => {
    assert.equal(countsAsStuck(rejected, { code: starter + "print(f\"Hi {name}\")\n", starter }), true);
    assert.equal(countsAsStuck({ mode: "fallback", passes: false, keywordError: null }, { code: "print('hi')", starter }), true);
  });
});
