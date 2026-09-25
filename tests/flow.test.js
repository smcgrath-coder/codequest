import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { runAndGrade, countsAsStuck, reachesIntoPython } from "../src/python/flow.js";
import { CHAPTERS, GRIND_CHALLENGES } from "../src/content.js";

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

test("if Python is still loading after the load limit, the keyword grader is used and the result says Python was late", async () => {
  const late = Object.assign(new Error("Python is taking too long to load"), { late: true });
  const r = await runAndGrade({ code: "print(1)", challenge, rule, attempt: 1, fallbackGrade,
    runner: { available: () => true, run: async () => { throw late; } } });
  assert.equal(r.mode, "fallback"); assert.equal(r.feedback, "keyword ok"); assert.equal(r.late, true);
  const failed = await runAndGrade({ code: "print(1)", challenge, rule, attempt: 1, fallbackGrade,
    runner: { available: () => true, run: async () => { throw new Error("load failed"); } } });
  assert.equal(failed.late, undefined, "a failed load isn't late");
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

  test("a grading pass that was stopped or ran too long is not stuck: it never judged the code", async () => {
    // What gradeCode resolves to when the kid presses Stop during "Checking your code…", or it times out.
    for (const graded of [{ passed: false, stopped: true, feedback: "Checking stopped before it finished. Press Run to try again." },
      { passed: false, timedOut: true, feedback: "Checking your program took too long. Look for a loop that never stops." }]) {
      const r = await run(fakeRunner(clean, graded));
      assert.equal(r.mode, "python"); assert.equal(r.run.ok, true); assert.equal(r.passes, false);
      assert.equal(countsAsStuck(r, { code: "print(1)", starter: challenge.starterCode }), false, graded.feedback);
    }
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

// Kid code shares its interpreter with grading, so code that reaches into Python's insides could make any
// room pass, or break grading for the rest of the tab. The page won't grade it and restarts Python.
describe("code that reaches into Python's insides", () => {
  const ways = [
    'import time\ntime.sleep.__globals__["EVAL_EXPR"] = lambda *a, **k: True',   // passes any room
    'import time\ntime.sleep.__globals__["evaluate"] = lambda *a, **k: []',       // poisons every later grade
    'import time\ng = getattr(time.sleep, "__globals__")',
    "import sys\nsys._getframe(1).f_globals['EVAL_EXPR'] = None",
    "import inspect\nframe = inspect.currentframe().f_back",
    "def f():\n    pass\nf.__code__ = (lambda: True).__code__",
    "for c in object.__subclasses__():\n    print(c)",
    "try:\n    1 / 0\nexcept Exception as e:\n    print(e.__traceback__.tb_frame.f_locals)",
    "g = (x for x in [1])\nprint(g.gi_frame.f_builtins)",
    "async def f():\n    pass\nprint(f().cr_frame)",
    // The worker's own message handler, replaced to fake a grade that carries the right id.
    "import js\nfrom pyodide.ffi import create_proxy\njs.self.onmessage = create_proxy(lambda e: None)",
    "import random, js", "import math as m, js", "from js import self", "import pyodide_js", "import pyodide.code", 'import sys\nsys.modules["_pyodide_core"]',
    "import _codequest", "import gc\ngc.get_referrers(print)", "from gc import get_objects", "from js.console import log", "import ctypes",
    '__import__("js")', "import importlib",
    // A name built from pieces, or looked up another way (the final review's bypasses).
    'import time\ngetattr(time.sleep, "__glob" + "als__")["EVAL_EXPR"] = None',
    "import time, inspect\nprint(inspect.getmembers(time.sleep))",
    "ex" + 'ec("import time")',   // split so a security hook doesn't read it as a shell call
    'code = compile("1", "x", "eval")', "import time\nprint(vars(time))", "print(print.__self__.__dict__)",
    "f = lambda: 1\nprint(f.__closure__)", 'setattr(print, "x", 1)', 'delattr(print, "x")', "print(object.__getattribute__)",
    "import sys\nprint(sys.modules)", "import builtins", "print(__builtins__)",
    // Python reads a fullwidth letter in a name as the plain one (NFKC), so time.sleep.__ｇlobals__ is __globals__.
    "import time\ntime.sleep.__ｇlobals__",
  ];
  test("each way in is spotted", () => {
    for (const code of ways) assert.equal(reachesIntoPython(code), true, code);
  });

  test("ordinary programs that look a little like them are not", () => {
    for (const code of ["import json", "import random, math", "jsx = 1\nprint(jsx)", "gc_count = 3", "from math import gcd",
      'print("Greetings from js land")', "frame = 1\nf_score = 2", "code = 'abc'\nglobals_left = 3", "print(__name__)",
      // The words themselves in a story or a variable name, not called or imported.
      'print("You inspect the chest.")', 'print("The wizard compiles his spells")', 'print("Execute the plan!")',
      "vars_left = 2\nprint(vars_left)", 'print("Loading modules...")', 'print("The builtins of the castle")', "executioner = 'Bob'",
      // A method of the same name is the module's own, not the built-in (import re, then re.compile).
      'import re\npattern = re.compile("[0-9]+")\nprint(pattern.findall("a1b22"))'])
      assert.equal(reachesIntoPython(code), false, code);
  });

  test("no reference, alternative or wrong answer, and no starter code, trips it", () => {
    for (const dir of ["solutions", "alternatives", "wrong"]) {
      const files = fs.readdirSync(new URL(`./fixtures/${dir}/`, import.meta.url)).filter(f => f.endsWith(".py"));
      assert.ok(files.length > 100, dir);
      for (const f of files) assert.equal(reachesIntoPython(fs.readFileSync(new URL(`./fixtures/${dir}/${f}`, import.meta.url), "utf8")), false, `${dir}/${f}`);
    }
    for (const c of [...CHAPTERS.flatMap(ch => [...ch.rooms, ch.boss]), ...GRIND_CHALLENGES])
      assert.equal(reachesIntoPython(c.starterCode || ""), false, c.id || c.name);
  });

  const cheat = ways[0];
  const watched = (run, graded = { passed: true, feedback: "Great work!" }) => {
    const calls = [];
    return { calls, runner: { available: () => true,
      run: async (code, { onOutput }) => { calls.push("run"); onOutput?.("hi\n", "stdout"); return run; },
      grade: async () => { calls.push("grade"); return graded; },
      restart: async () => { calls.push("restart"); } } };
  };

  test("it still runs, so the kid sees the output, but it isn't graded, and Python is restarted", async () => {
    const { calls, runner } = watched({ ok: true, stdout: "hi\n", inputs: [] });
    const seen = [];
    let grading = 0;
    const r = await runAndGrade({ code: cheat, challenge, rule, attempt: 1, fallbackGrade, runner,
      onOutput: t => seen.push(t), onGrading: () => grading++ });
    assert.deepEqual(calls, ["run", "restart"]);
    assert.deepEqual(seen, ["hi\n"]);
    assert.equal(grading, 0, "never says it's checking");
    assert.equal(r.mode, "python"); assert.equal(r.passes, false); assert.equal(r.graded, undefined);
    assert.match(r.feedback, /reaches into Python's insides, so I can't check it/);
    assert.equal(countsAsStuck(r, { code: cheat, starter: challenge.starterCode }), false, "it can't unlock Mark it done");
  });

  test("a crash or Stop in it is explained as usual, and Python is still restarted", async () => {
    for (const run of [{ ok: false, kind: "ZeroDivisionError", line: 2, text: "ZeroDivisionError: division by zero" }, { ok: false, kind: "Stopped", stopped: true }]) {
      const { calls, runner } = watched(run);
      const r = await runAndGrade({ code: cheat, challenge, rule, attempt: 1, fallbackGrade, runner });
      assert.deepEqual(calls, ["run", "restart"], run.kind);
      assert.equal(r.passes, false); assert.ok(r.error.headline, run.kind);
    }
  });

  test("without a rule it isn't keyword-graded either", async () => {
    const { calls, runner } = watched({ ok: true, inputs: [] });
    const r = await runAndGrade({ code: cheat, challenge, rule: undefined, attempt: 1, fallbackGrade, runner });
    assert.deepEqual(calls, ["run", "restart"]); assert.equal(r.passes, false);
  });

  test("when Python can't run, the keyword grader grades it as usual: nothing in the page can be reached", async () => {
    const r = await runAndGrade({ code: cheat, challenge, rule, attempt: 1, fallbackGrade, runner: { available: () => false } });
    assert.equal(r.mode, "fallback"); assert.equal(r.feedback, "keyword ok");
  });
});
