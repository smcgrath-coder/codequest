import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { loadPyodide } from "pyodide";

let py, runVisible, out;
const naps = [], napTarget = new Int32Array(new SharedArrayBuffer(4));
const src = f => fs.readFileSync(new URL(`../src/python/${f}`, import.meta.url), "utf8");
before(async () => {
  py = await loadPyodide();
  py.setStdout({ write: b => { out += new TextDecoder().decode(b); return b.length; } });
  // Really waits, like the worker's Atomics.wait nap, and records each nap.
  py.registerJsModule("_codequest", { sleep_ms: ms => { naps.push(ms); Atomics.wait(napTarget, 0, 0, ms); } });
  py.runPython(src("harness.py"), { dedent: false });
  runVisible = py.globals.get("run_visible");
});
const run = code => {
  out = "";
  const r = runVisible(code); const res = r.toJs({ dict_converter: Object.fromEntries }); r.destroy();
  return { ...res, out };
};

describe("run_visible", () => {
  test("prints reach stdout and ok is true", () => {
    const r = run('print("Hello, World!")');
    assert.equal(r.ok, true); assert.equal(r.out, "Hello, World!\n");
  });

  test("__name__ is __main__", () => {
    assert.equal(run('if __name__ == "__main__":\n    print("main")').out, "main\n");
  });

  const errors = [
    ["x = 5\nif x > 3\n    print('big')", "SyntaxError", 2, /expected ':'/],
    ["print('hello)", "SyntaxError", 1, /unterminated string literal/],
    ["if True:\nprint('hi')", "IndentationError", 2, /expected an indented block/],
    ["  print('hi')", "IndentationError", 1, /unexpected indent/],
    ["score = 10\nprint(scre)", "NameError", 2, /Did you mean: 'score'/],
    ["age = 10\nprint('I am ' + age)", "TypeError", 2, /can only concatenate str/],
    ["a = 1\nb = 0\nprint(a / b)", "ZeroDivisionError", 3, /division by zero/],
    ["items = ['a']\nprint(items[1])", "IndexError", 2, /out of range/],
    ["d = {'hp': 3}\nprint(d['xp'])", "KeyError", 2, /'xp'/],
    ["def f():\n    return 1 / 0\n\nf()", "ZeroDivisionError", 2, /division by zero/],
  ];
  for (const [code, kind, line, text] of errors) test(`${kind} is reported on editor line ${line}`, () => {
    const r = run(code);
    assert.equal(r.ok, false); assert.equal(r.kind, kind); assert.equal(r.line, line); assert.match(r.text, text);
  });

  test("output printed before a crash is kept", () => {
    const r = run('print("before")\nprint(1 / 0)');
    assert.equal(r.out, "before\n"); assert.equal(r.kind, "ZeroDivisionError");
  });

  test("a SyntaxError inside eval() points at the kid's line, not the string's", () => {
    const r = run('print("a")\nx = eval("2 +")');
    assert.equal(r.kind, "SyntaxError"); assert.equal(r.line, 2);
  });

  test("output without a final newline still reaches stdout", () => {
    assert.equal(run('print("Ready?", end="")').out, "Ready?");
  });

  test("time.sleep naps in short steps through _codequest, so Stop can get in between", () => {
    naps.length = 0;
    const r = run("import time\ntime.sleep(0.2)\nprint('awake')");
    assert.equal(r.ok, true); assert.equal(r.out, "awake\n");
    assert.ok(naps.length >= 4, `napped ${naps.length} times`); assert.ok(naps.every(ms => ms > 0 && ms <= 50));
  });

  test("exit() ends the program normally", () => {
    const r = run('print("bye")\nexit()\nprint("never")');
    assert.equal(r.ok, true); assert.equal(r.out, "bye\n");
  });
});

describe("clean slate between runs", () => {
  test("variables do not leak into the next run", () => {
    run("secret = 42");
    assert.equal(run("print(secret)").kind, "NameError");
  });
  test("patching random or builtins does not leak", () => {
    run("import random, builtins\nrandom.randint = lambda a, b: 6\nbuiltins.print = None");
    const r = run("import random\nprint(random.randint(1, 1))");
    assert.equal(r.ok, true); assert.equal(r.out, "1\n");
  });
  test("a module the kid made in one run is not cached for the next", () => {
    run("import sys, types\nm = types.ModuleType('helper')\nm.x = 1\nsys.modules['helper'] = m");
    assert.equal(run("import helper").kind, "ModuleNotFoundError");
  });
  test("a recursion limit lowered by one run is put back for the next", () => {
    run("import sys\nsys.setrecursionlimit(50)");
    assert.equal(run("def down(n):\n    return 0 if n == 0 else down(n - 1)\nprint(down(200))").out, "0\n");
  });
  test("a program that swaps out sys.stdout still finishes, and the next run prints normally", () => {
    assert.equal(run('import sys\nsys.stdout = None\nprint("lost")').ok, true);
    assert.equal(run('print("back")').out, "back\n");
  });
  test("random is freshly seeded each visible run (dice vary), even after a run that set a seed", () => {
    const rolls = new Set(Array.from({ length: 6 }, () => {
      run("import random\nrandom.seed(1)");
      return run("import random\nprint(random.randint(1, 1000000))").out;
    }));
    assert.ok(rolls.size > 1);
  });
});
