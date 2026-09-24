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

  test("time.sleep still works after the program swaps out sys.stdout", () => {
    assert.equal(run("import sys, time\nsys.stdout = None\ntime.sleep(0.01)").ok, true);
  });

  test("exit() ends the program normally", () => {
    const r = run('print("bye")\nexit()\nprint("never")');
    assert.equal(r.ok, true); assert.equal(r.out, "bye\n");
  });

  test("import __main__ gives the kid's own program, as in real Python", () => {
    assert.equal(run("score = 7\nimport __main__\nprint(__main__.score, __main__.__name__)").out, "7 __main__\n");
  });

  test("an error whose message can't be turned into text is still reported", () => {
    const r = run("class Grumpy(Exception):\n    def __str__(self):\n        raise ValueError('no')\n\nraise Grumpy()");
    assert.equal(r.kind, "Grumpy"); assert.equal(r.line, 5);
    assert.equal(r.text, "Grumpy: <exception str() failed>"); assert.equal(r.msg, "<exception str() failed>");
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
  // The lowest limit Python accepts at the kid's top level leaves the harness no room for its own calls.
  const LOWEST_LIMIT = "import sys\nfor n in range(1, 20):\n    try:\n        sys.setrecursionlimit(n)\n        break\n    except RecursionError:\n        pass\n";
  for (const [limit, code] of [["50", "import sys\nsys.setrecursionlimit(50)\n"], ["the lowest Python accepts", LOWEST_LIMIT]]) {
    test(`a recursion limit lowered to ${limit} by one run is put back for the next`, () => {
      assert.equal(run(code).ok, true);   // Python accepted it
      assert.equal(run("def down(n):\n    return 0 if n == 0 else down(n - 1)\nprint(down(200))").out, "0\n");
    });
  }
  test("a program that lowers the recursion limit that far and then crashes still gets its error reported", () => {
    const r = run(LOWEST_LIMIT + "print(1 / 0)");
    assert.equal(r.kind, "ZeroDivisionError"); assert.equal(r.line, 8);
  });
  test("a program that swaps out sys.stdout still finishes, and the next run prints normally", () => {
    assert.equal(run('import sys\nsys.stdout = None\nprint("lost")').ok, true);
    assert.equal(run('print("back")').out, "back\n");
  });
  const harms = ["sys.stdout.close()", "sys.stderr.close()", "sys.stdin.close()", "sys.__stdout__.close()",
    "sys.stdout.detach()", "sys.stdout.write = lambda s: len(s)", 'sys.stdout.reconfigure(encoding="ascii")'];
  for (const harm of harms) test(`${harm} still finishes, and the next run gets working streams`, () => {
    assert.equal(run(`import sys\n${harm}`).ok, true);
    const r = run('import sys\nprint("back", sys.stdin.closed, sys.stderr.closed, "é")\nsys.stdout = sys.__stdout__\nprint("again")');
    assert.equal(r.out, "back False False é\nagain\n");
  });
  test("random is freshly seeded each visible run (dice vary), even after a run that set a seed", () => {
    const rolls = new Set(Array.from({ length: 6 }, () => {
      run("import random\nrandom.seed(1)");
      return run("import random\nprint(random.randint(1, 1000000))").out;
    }));
    assert.ok(rolls.size > 1);
  });
  test("a program that breaks builtins still gets its own error reported, and the next run works", () => {
    // Python's traceback code uses these too, so they must be put back before the error is described.
    const r = run("import builtins\nfor name in ['list', 'vars', 'isinstance', 'len', 'str', 'type']:\n    setattr(builtins, name, None)\nprint(1 / 0)");
    assert.equal(r.kind, "ZeroDivisionError"); assert.equal(r.line, 4);
    assert.equal(run('print("fine")').out, "fine\n");
  });
  test("builtins broken after a program has ended, by a __del__, can't break the next run", () => {
    // s is freed with the traceback, after the program and its error report are done.
    const saboteur = "import builtins\nclass Saboteur:\n    def __del__(self):\n        builtins.list = None\n        builtins.vars = None\n\n"
      + "def boom():\n    s = Saboteur()\n    1 / 0\n\nboom()";
    assert.equal(run(saboteur).kind, "ZeroDivisionError");
    const r = run('print("fine")');
    assert.equal(r.ok, true); assert.equal(r.out, "fine\n");
  });
  test("a program that breaks the sys and traceback functions the harness uses still gets its error reported, and so does the next", () => {
    try {
      const r = run("import sys, traceback\nsys.setrecursionlimit = None\ntraceback.extract_tb = traceback.format_exception = None\nprint(1 / 0)");
      assert.equal(r.kind, "ZeroDivisionError"); assert.equal(r.line, 4);
      const next = run("print(len(5))");
      assert.equal(next.kind, "TypeError"); assert.equal(next.line, 1);
    } finally {   // clean_slate puts back traceback but not sys's functions, so do that for the tests after this one
      py.runPython("sys.setrecursionlimit = _setrecursionlimit");
    }
  });
  test("kid code can't rebind the harness's own helpers through __main__", () => {
    run('import __main__\n__main__.error_info = lambda e: {"ok": True}\n__main__.clean_slate = lambda seed=None: None');
    assert.equal(run("print(1 / 0)").kind, "ZeroDivisionError");
    run("import sys, types\nsys.modules['helper'] = types.ModuleType('helper')");
    assert.equal(run("import helper").kind, "ModuleNotFoundError", "clean_slate still runs");
    assert.equal(py.runPython('import sys\nsys.modules["__main__"].run_visible is run_visible'), true,
      "between runs, __main__ is the harness again");
  });
  // Describing an error runs kid code too, after the program has ended.
  const rebind = '        import __main__\n        __main__.error_info = lambda e: {"ok": True}\n';
  test("nor through __main__ in an error's __str__", () => {
    const r = run(`class Sneaky(Exception):\n    def __str__(self):\n${rebind}        return "sneaky"\n\nraise Sneaky()`);
    assert.equal(r.kind, "Sneaky"); assert.equal(r.text, "Sneaky: sneaky");
    assert.equal(run("print(1 / 0)").kind, "ZeroDivisionError");
  });
  test("nor through __main__ in a __del__ that runs when the error is freed", () => {
    const r = run(`class Sneaky:\n    def __del__(self):\n${rebind}\ndef boom():\n    s = Sneaky()\n    1 / 0\n\nboom()`);
    assert.equal(r.kind, "ZeroDivisionError");
    assert.equal(run("print(1 / 0)").kind, "ZeroDivisionError");
  });
  // The modules the harness itself relies on to report errors, import and sleep.
  test("a program that breaks traceback can't stop the next run's error being reported", () => {
    assert.equal(run("import traceback\ntraceback.TracebackException = None").ok, true);
    const r = run("print(1 / 0)");
    assert.equal(r.kind, "ZeroDivisionError"); assert.equal(r.line, 1); assert.equal(r.text, "ZeroDivisionError: division by zero");
  });
  test("a program that breaks linecache can't stop the next run", () => {
    assert.equal(run("import linecache\nlinecache.cache = None").ok, true);
    const r = run('print("fine")\nprint(1 / 0)');
    assert.equal(r.out, "fine\n"); assert.equal(r.kind, "ZeroDivisionError"); assert.equal(r.line, 2);
  });
  for (const harm of ["import traceback\ntraceback.TracebackException = None", "import linecache\nlinecache.cache = None",
    "import linecache\nlinecache.getline = None"]) {
    test(`a program that runs ${JSON.stringify(harm)} and then crashes still gets its own error reported`, () => {
      const r = run(`${harm}\nprint(1 / 0)`);
      assert.equal(r.kind, "ZeroDivisionError"); assert.equal(r.line, 3); assert.equal(r.text, "ZeroDivisionError: division by zero");
    });
  }
  test("a module replaced in sys.modules is put back for the next run", () => {
    assert.equal(run("import sys\nsys.modules['math'] = None").ok, true);
    assert.equal(run("import math\nprint(math.sqrt(16))").out, "4.0\n");
  });
  test("a module removed from sys.modules is put back too, not imported again as a new copy", () => {
    // A new copy of random would miss clean_slate's seeding, and its patches would never be undone.
    assert.equal(run("import sys\ndel sys.modules['random']").ok, true);
    assert.equal(run("import random").ok, true);
    assert.equal(py.runPython('import sys\nsys.modules["random"] is random'), true);
  });
  test("a program that swaps out _codequest.sleep_ms can't break time.sleep in the next run", () => {
    assert.equal(run("import _codequest\n_codequest.sleep_ms = None").ok, true);
    naps.length = 0;
    const r = run("import time\ntime.sleep(0.01)\nprint('awake')");
    assert.equal(r.ok, true, r.text); assert.equal(r.out, "awake\n"); assert.ok(naps.length > 0, "napped through _codequest");
  });
});
