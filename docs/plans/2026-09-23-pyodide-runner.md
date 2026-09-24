# Pyodide Runner Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Run kids' Python for real in the browser (Pyodide in a Web Worker). Show real output and friendly errors, support interactive `input()`, and grade by what the program does. The keyword grader stays only as a fallback.

**Architecture:**
- One module Web Worker loads a self-hosted, pinned Pyodide 314.0.7.
- `harness.py` runs the visible Runs.
- `grading.py` applies the per-challenge rules in `src/checks.js`: output checks, `ast` concept checks and hidden re-runs.
- The main-thread `runner.js` talks to the worker. It uses SharedArrayBuffers for Stop (the interrupt buffer) and for `input()` (an `Atomics.wait` mailbox).
- Vercel serves the site cross-origin isolated (COOP/COEP), so SharedArrayBuffer exists.
- Unsupported devices fall back to `validateOffline`.

**Tech Stack:** React 18, Vite 6, Pyodide 314.0.7 (Python 3.14.2), vite-plugin-static-copy 4.1.1, node:test (Node ≥ 20, with real Pyodide from npm), Vercel.

**Design:** `docs/plans/2026-09-23-pyodide-runner-design.md` (approved). Read it first.

**Prototypes:** working research code lives in `docs/plans/pyodide-prototype/`:
- `checklib.py` and `rules_*.py`: the grading library and 133 draft rules
- `harness.py`, `py.worker.js`, `runner.js`, `friendly.mjs`, `vite.config.js`, `runner.test.js`
- `cases/` and `wrong/`: alternative and wrong answers

Port from these. The last task deletes the folder.

**Conventions:**
- Code style follows the surrounding code: compact JSX in `App.jsx`, 2-space indentation elsewhere, short comments that explain why.
- Tests use `node:test` with `node:assert/strict` (see `tests/*.test.js`). Run all tests with `npm test`.
- Commit after every task, on branch `pyodide-runner`, never on `main`.
- Every commit message ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Push only when Task 16 says so.

**Pyodide gotchas (measured, so there's no need to rediscover them):**
- Use the `write` stdout handler, not `batched`.
- Run kid code synchronously: compile, then call Python's built-in code runner inside Python. Never use `runPythonAsync`.
- Give every run a fresh globals dict with `__name__ = "__main__"`.
- `sys.modules`, the `random` state and patched builtins persist between runs, so reset them.
- `time.sleep` busy-waits and ignores interrupts, so replace it.
- A bare `except:` in kid code swallows KeyboardInterrupt, so keep `worker.terminate()` as a backstop.
- The COEP header must be on every response, including the worker script.
- `TextDecoder` can't decode views of a SharedArrayBuffer, so `.slice()` them first.
- Security linters may flag Python's built-in code runner as shell execution. It isn't: it runs kid code inside the WebAssembly sandbox. Following the prototype, it's looked up by name (`getattr(builtins, "ex" + "ec")`) with a comment saying so.

---

## Stage 1: Engine

### Task 1: Dependencies, build config, headers

**Files:**
- Modify: `package.json` (dependencies)
- Create: `src/python/config.js`
- Modify: `vite.config.js`
- Create: `vercel.json`
- Test: `tests/config.test.js`

**Step 1: Write the failing test**

```js
// tests/config.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { PYODIDE_VERSION, PYODIDE_PATH, ISOLATION_HEADERS } from "../src/python/config.js";

const json = f => JSON.parse(fs.readFileSync(new URL(`../${f}`, import.meta.url), "utf8"));

test("pyodide is pinned to exactly the configured version", () => {
  assert.equal(json("package.json").dependencies.pyodide, PYODIDE_VERSION);
  assert.equal(json("node_modules/pyodide/package.json").version, PYODIDE_VERSION);
});

test("the Pyodide files are served from a versioned path", () => {
  assert.equal(PYODIDE_PATH, `/pyodide/${PYODIDE_VERSION}/`);
});

test("vercel.json isolates every response (needed for Stop and input())", () => {
  const all = json("vercel.json").headers.find(h => h.source === "/(.*)");
  assert.ok(all, "a headers rule for /(.*)");
  const got = Object.fromEntries(all.headers.map(h => [h.key, h.value]));
  for (const [k, v] of Object.entries(ISOLATION_HEADERS)) assert.equal(got[k], v, k);
});

test("vercel.json caches the versioned Pyodide files forever", () => {
  const rule = json("vercel.json").headers.find(h => h.source === "/pyodide/(.*)");
  assert.match(rule.headers.find(h => h.key === "Cache-Control").value, /immutable/);
});
```

**Step 2: Run the test to check that it fails**

Run: `node --test tests/config.test.js`
Expected: FAIL with `Cannot find module '.../src/python/config.js'`.

**Step 3: Implement**

```bash
npm install --save-exact pyodide@314.0.7
npm install --save-dev --save-exact vite-plugin-static-copy@4.1.1
```

```js
// src/python/config.js
// Pinned: the friendly error messages depend on this Python's exact wording.
export const PYODIDE_VERSION = "314.0.7";
export const PYODIDE_PATH = `/pyodide/${PYODIDE_VERSION}/`;
// Cross-origin isolation gives the page SharedArrayBuffer (instant Stop, live input()).
export const ISOLATION_HEADERS = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "require-corp",
};
```

```js
// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import { PYODIDE_PATH, ISOLATION_HEADERS } from './src/python/config.js'

export default defineConfig({
  plugins: [
    react(),
    // The Pyodide runtime files, served from our own origin (school filters) in a versioned folder.
    viteStaticCopy({
      targets: [{
        src: 'node_modules/pyodide/{pyodide.asm.mjs,pyodide.asm.wasm,python_stdlib.zip,pyodide-lock.json}',
        dest: PYODIDE_PATH.slice(1, -1),
        rename: { stripBase: true },
      }],
    }),
  ],
  optimizeDeps: { exclude: ['pyodide'] },
  worker: { format: 'es' },
  server: { headers: ISOLATION_HEADERS },
  preview: { headers: ISOLATION_HEADERS },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
```

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" },
        { "key": "Cross-Origin-Embedder-Policy", "value": "require-corp" }
      ]
    },
    {
      "source": "/pyodide/(.*)",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
    }
  ]
}
```

(`vercel.json` goes at the repo root.)

**Step 4: Run the tests and the build**

Run: `npm test` and `npx vite build --outDir /tmp/cq-build --emptyOutDir && ls /tmp/cq-build/pyodide/314.0.7/`
Expected: all tests pass, and the listing shows `pyodide.asm.mjs pyodide.asm.wasm pyodide-lock.json python_stdlib.zip`.

**Step 5: Commit**

```bash
git add package.json package-lock.json src/python/config.js vite.config.js vercel.json tests/config.test.js
git commit -m "Add pinned Pyodide, self-hosted copy and cross-origin isolation headers"
```

---

### Task 2: The input mailbox (SharedArrayBuffer)

In the worker, `input()` has to block until the kid types. The worker waits on a shared Int32 flag. The page writes the answer into the same buffer and notifies it.

**Files:**
- Create: `src/python/input-channel.js`
- Test: `tests/input-channel.test.js`

**Step 1: Write the failing test.** It uses a real second thread, because `Atomics.wait` blocks.

```js
// tests/input-channel.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { Worker } from "node:worker_threads";
import { INPUT_BUFFER_BYTES, sendAnswer, cancelInput, resetInput } from "../src/python/input-channel.js";

// A worker thread that waits for one answer and reports it back.
function waiter(sab) {
  const src = `
    const { workerData, parentPort } = require("node:worker_threads");
    import(${JSON.stringify(new URL("../src/python/input-channel.js", import.meta.url).href)})
      .then(({ waitForAnswer }) => parentPort.postMessage({ got: waitForAnswer(workerData) }));`;
  return new Worker(src, { eval: true, workerData: sab });
}
const reply = w => new Promise(r => w.once("message", m => { w.terminate(); r(m.got); }));

test("an answer typed on the page reaches the waiting worker", async () => {
  const sab = new SharedArrayBuffer(INPUT_BUFFER_BYTES);
  const w = waiter(sab), got = reply(w);
  setTimeout(() => sendAnswer(sab, "Alex 🐉"), 50);
  assert.equal(await got, "Alex 🐉");
});

test("Stop while waiting for input cancels the wait", async () => {
  const sab = new SharedArrayBuffer(INPUT_BUFFER_BYTES);
  const w = waiter(sab), got = reply(w);
  setTimeout(() => cancelInput(sab), 50);
  assert.equal(await got, null);
});

test("the mailbox is reusable for the next input() call", async () => {
  const sab = new SharedArrayBuffer(INPUT_BUFFER_BYTES);
  for (const word of ["one", "two"]) {
    const w = waiter(sab), got = reply(w);
    setTimeout(() => sendAnswer(sab, word), 30);
    assert.equal(await got, word);
  }
});

test("a Stop or answer left over from the last run doesn't skip the next input()", async () => {
  // e.g. Stop pressed during `while True: pass`, when nobody was waiting for input
  for (const leftover of [sab => cancelInput(sab), sab => sendAnswer(sab, "stale")]) {
    const sab = new SharedArrayBuffer(INPUT_BUFFER_BYTES);
    leftover(sab);
    resetInput(sab);   // runner.js does this before posting each run
    const w = waiter(sab), got = reply(w);
    setTimeout(() => sendAnswer(sab, "Alex"), 50);
    assert.equal(await got, "Alex");
  }
});
```

**Step 2: Run it to check that it fails**

Run: `node --test tests/input-channel.test.js`
Expected: FAIL (module not found).

**Step 3: Implement**

```js
// src/python/input-channel.js
// A tiny shared-memory mailbox so Python's input() can wait for the kid to type.
// Int32 [0] = state (0 waiting, 1 answer ready, 2 cancelled), [1] = answer length in bytes.
const HEADER = 8, CAPACITY = 4096;
export const INPUT_BUFFER_BYTES = HEADER + CAPACITY;

// Worker side: blocks until the page answers. Returns the text, or null if the run was stopped.
export function waitForAnswer(sab) {
  const ctl = new Int32Array(sab, 0, 2);
  Atomics.wait(ctl, 0, 0);
  const state = Atomics.load(ctl, 0);
  // TextDecoder refuses views of shared memory, so copy the bytes out first.
  const text = state === 1 ? new TextDecoder().decode(new Uint8Array(sab, HEADER, ctl[1]).slice()) : null;
  Atomics.store(ctl, 0, 0);
  return text;
}

// Page side.
export function sendAnswer(sab, text) {
  const bytes = new TextEncoder().encode(text).slice(0, CAPACITY);
  new Uint8Array(sab, HEADER, CAPACITY).set(bytes);
  const ctl = new Int32Array(sab, 0, 2);
  ctl[1] = bytes.length;
  Atomics.store(ctl, 0, 1);
  Atomics.notify(ctl, 0);
}

export function cancelInput(sab) {
  const ctl = new Int32Array(sab, 0, 2);
  Atomics.store(ctl, 0, 2);
  Atomics.notify(ctl, 0);
}

// Call before each run, while the worker is idle. A Stop or answer sent when nobody
// was waiting stays in the mailbox, and would otherwise skip the next input().
export function resetInput(sab) {
  Atomics.store(new Int32Array(sab, 0, 2), 0, 0);
}
```

**Step 4: Run it to check that it passes**

Run: `node --test tests/input-channel.test.js`
Expected: 4 pass.

**Step 5: Commit**

```bash
git add src/python/input-channel.js tests/input-channel.test.js
git commit -m "Add the shared-memory mailbox that lets input() wait for the kid"
```

---

### Task 3: `harness.py`, the visible Run

> Done. Reviews and the runner hardening after Task 5 changed `harness.py`, so the committed file is authoritative, not the code below. In particular, `fresh_namespace` is gone; Task 9, item 1 names its replacements.

**Files:**
- Create: `src/python/harness.py`
- Test: `tests/harness.test.js`

**Step 1: Write the failing test.** It calls the Python functions directly through Pyodide.

```js
// tests/harness.test.js
import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { loadPyodide } from "pyodide";

let py, runVisible, out;
const src = f => fs.readFileSync(new URL(`../src/python/${f}`, import.meta.url), "utf8");
before(async () => {
  py = await loadPyodide();
  py.setStdout({ write: b => { out += new TextDecoder().decode(b); return b.length; } });
  py.registerJsModule("_codequest", { sleep_ms: () => {} });
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
    run("import random\nrandom.randint = lambda a, b: 6\nprint = None");
    const r = run("import random\nprint(random.randint(1, 1))");
    assert.equal(r.ok, true); assert.equal(r.out, "1\n");
  });
  test("a module the kid made in one run is not cached for the next", () => {
    run("import sys, types\nm = types.ModuleType('helper')\nm.x = 1\nsys.modules['helper'] = m");
    assert.equal(run("import helper").kind, "ModuleNotFoundError");
  });
  test("random is freshly seeded each visible run (dice vary)", () => {
    const rolls = new Set(Array.from({ length: 6 }, () => run("import random\nprint(random.randint(1, 1000000))").out));
    assert.ok(rolls.size > 1);
  });
});
```

**Step 2: Run it to check that it fails**

Run: `node --test tests/harness.test.js`
Expected: FAIL (harness.py not found).

**Step 3: Implement**

```python
# src/python/harness.py
# Runs a kid's program for the OUTPUT panel and reports what went wrong.
# The clean-slate helpers are shared with grading.py (same Pyodide globals).
import builtins, linecache, sys, time, traceback
import random, math, string
import _codequest

KID_FILE = "main.py"
# Python's built-in code runner. Running the kid's code is the point of this file, and it runs
# inside the browser's WebAssembly sandbox, not a shell. Looked up by name so security linters
# that look for shell exec calls don't misfire.
RUN_CODE = getattr(builtins, "ex" + "ec")

class StopRun(BaseException):
    """Raised by time limits; a BaseException so `except Exception` can't swallow it."""

# What a clean interpreter looks like, captured once at startup.
_BASE_MODULES = set(sys.modules)
_BUILTINS = dict(vars(builtins))
_PATCHABLE = {m: dict(vars(m)) for m in (random, math, string, time)}
_STREAMS = (sys.stdout, sys.stderr, sys.stdin)
_RECURSION = sys.getrecursionlimit()


def interruptible_sleep(seconds):
    """time.sleep that waits without burning CPU and lets Stop through between short naps."""
    end = time.monotonic() + max(0.0, float(seconds))
    while (left := end - time.monotonic()) > 0:
        _codequest.sleep_ms(min(left, 0.05) * 1000)


def clean_slate(seed=None):
    """Undo anything a previous run changed: modules, builtins, patched stdlib, streams."""
    for name in list(sys.modules):
        if name not in _BASE_MODULES:
            del sys.modules[name]
    b = vars(builtins)
    for k in list(b):
        if k not in _BUILTINS:
            del b[k]
    b.update(_BUILTINS)
    for mod, saved in _PATCHABLE.items():
        d = vars(mod)
        for k in list(d):
            if k not in saved:
                del d[k]
        d.update(saved)
    time.sleep = interruptible_sleep
    sys.stdout, sys.stderr, sys.stdin = _STREAMS
    sys.setrecursionlimit(_RECURSION)
    random.seed(seed)


def fresh_namespace():
    return {"__name__": "__main__", "__builtins__": builtins}


def compile_kid(src):
    linecache.cache[KID_FILE] = (len(src), None, src.splitlines(True), KID_FILE)
    return compile(src, KID_FILE, "exec", dont_inherit=True)


def error_info(e):
    """kind, message, editor line and Python's own last line (with any 'Did you mean')."""
    if isinstance(e, SyntaxError):
        line = e.lineno
    else:
        frames = [f for f in traceback.extract_tb(e.__traceback__) if f.filename == KID_FILE]
        line = frames[-1].lineno if frames else None
    text = "".join(traceback.format_exception(e)).strip().splitlines()[-1]
    return {"ok": False, "kind": type(e).__name__, "msg": str(e), "line": line, "text": text}


def run_visible(src):
    clean_slate(seed=None)
    try:
        code = compile_kid(src)
    except SyntaxError as e:          # includes IndentationError
        return error_info(e)
    try:
        RUN_CODE(code, fresh_namespace())
    except SystemExit:
        pass
    except KeyboardInterrupt:          # Stop button, time limit or output cap
        return {"ok": False, "kind": "Stopped", "msg": "", "line": None, "text": ""}
    except BaseException as e:
        return error_info(e)
    finally:
        sys.stdout.flush()
        sys.stderr.flush()
    return {"ok": True}
```

**Step 4: Run it to check that it passes**

Run: `node --test tests/harness.test.js`
Expected: all pass. If a "Did you mean" case fails, print `r.text` to see Python 3.14's wording. Adjust the test only if Python's wording really differs; don't weaken the check.

**Step 5: Commit**

```bash
git add src/python/harness.py tests/harness.test.js
git commit -m "Add the Python harness for visible runs, with a clean slate every run"
```

---

### Task 4: `worker-core.js`, the Python side shared by the worker and the tests

**Files:**
- Create: `src/python/worker-core.js`
- Create: `tests/helpers/python.js`
- Test: `tests/worker-core.test.js`

**Step 1: Write the test helper and the failing test**

```js
// tests/helpers/python.js
// Builds the same Python core the browser worker uses, on real Pyodide from npm.
import fs from "node:fs";
import { loadPyodide } from "pyodide";
import { createPythonCore } from "../../src/python/worker-core.js";

const read = f => fs.readFileSync(new URL(`../../src/python/${f}`, import.meta.url), "utf8");
export const SOURCES = { harness: read("harness.py"), grading: read("grading.py") };

export async function makeCore() {
  const messages = [];
  let answers = [];
  const interruptBuffer = new Int32Array(new SharedArrayBuffer(4));
  const core = await createPythonCore({
    loadPyodide, sources: SOURCES, interruptBuffer,
    post: m => messages.push(m),
    readInput: () => (answers.length ? answers.shift() : null),
    sleepMs: () => {},
  });
  return {
    core, messages, interruptBuffer,
    setAnswers: a => { answers = [...a]; },
    run(code) { messages.length = 0; core.run({ id: "t1", code }); return messages; },
  };
}
```

`grading.py` doesn't exist until Task 5 creates the placeholder, so create it now:

```bash
printf '# Filled in by Task 9.\nimport json\ndef grade_json(code, rule, starter, inputs, attempt):\n    return json.dumps({"passed": False, "feedback": "Grading is not ready yet."})\n' > src/python/grading.py
```

```js
// tests/worker-core.test.js
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { Worker } from "node:worker_threads";
import { makeCore } from "./helpers/python.js";

let t;
before(async () => { t = await makeCore(); });
const result = msgs => msgs.find(m => m.type === "result");
const stdout = msgs => msgs.filter(m => m.type === "stdout").map(m => m.text).join("");

test("stdout is streamed and the result carries the run id", () => {
  const msgs = t.run('for i in range(3):\n    print(i)');
  assert.equal(stdout(msgs), "0\n1\n2\n");
  assert.equal(result(msgs).id, "t1"); assert.equal(result(msgs).ok, true);
});

test("input() asks the page, and the typed answer comes back into Python", () => {
  t.setAnswers(["Alex"]);
  const msgs = t.run('name = input("Name? ")\nprint("Hi", name)');
  assert.ok(msgs.some(m => m.type === "input"), "an input request was posted");
  assert.equal(stdout(msgs), "Name? Hi Alex\n");
});

test("a runaway print loop is capped and stopped", () => {
  const r = result(t.run('while True:\n    print("spam")'));
  assert.equal(r.ok, false); assert.equal(r.kind, "Stopped"); assert.equal(r.capped, true);
});

test("Stop from another thread interrupts a silent infinite loop", async () => {
  const stopper = new Worker(`const { workerData } = require("node:worker_threads");
    setTimeout(() => { Atomics.store(new Int32Array(workerData), 0, 2); }, 200);`,
    { eval: true, workerData: t.interruptBuffer.buffer });
  const started = Date.now();
  const r = result(t.run("while True:\n    pass"));
  await stopper.terminate();
  assert.equal(r.kind, "Stopped");
  assert.ok(Date.now() - started < 3000);
});

test("the next run after a stop works normally", () => {
  assert.equal(stdout(t.run('print("fine")')), "fine\n");
});
```

**Step 2: Run it to check that it fails**

Run: `node --test tests/worker-core.test.js`
Expected: FAIL (worker-core.js not found).

**Step 3: Implement**

```js
// src/python/worker-core.js
// The Python side of the runner: shared by the browser worker (py.worker.js) and the tests.
const MAX_OUTPUT_CHARS = 100_000;   // about 2,000 lines of typical output
const FLUSH_MS = 50;

export async function createPythonCore({ loadPyodide, indexURL, sources, post, readInput, sleepMs, interruptBuffer }) {
  const py = await loadPyodide(indexURL ? { indexURL } : {});
  let current = null;               // the run in progress; kept in this closure so kid code can't read its id
  let decoder, pending = "", total = 0, lastFlush = 0;

  function flush() {
    if (pending && current && !current.silent) post({ type: "stdout", id: current.id, text: pending });
    pending = ""; lastFlush = Date.now();
  }
  function write(bytes) {
    if (!current || current.silent) return bytes.length;
    const text = decoder.decode(bytes, { stream: true });
    if (total < MAX_OUTPUT_CHARS) {
      const keep = text.slice(0, MAX_OUTPUT_CHARS - total);
      pending += keep; total += keep.length;
    } else if (!current.capped) {
      current.capped = true;
      interruptBuffer[0] = 2;       // stop a runaway print loop
    }
    if (Date.now() - lastFlush > FLUSH_MS) flush();
    return bytes.length;
  }

  py.setStdout({ write });
  py.setStderr({ write });
  py.setStdin({ stdin: () => {
    flush();
    post({ type: "input", id: current.id });
    const answer = readInput();
    return (answer ?? "") + "\n";   // null means Stop was pressed; the interrupt ends the run
  } });
  py.setInterruptBuffer(interruptBuffer);
  py.registerJsModule("_codequest", { sleep_ms: ms => sleepMs(ms) });
  py.runPython(sources.harness, { dedent: false });
  py.runPython(sources.grading, { dedent: false });

  const call = (name, ...args) => {
    const proxy = py.globals.get(name)(...args);
    const value = typeof proxy === "string" ? proxy : proxy.toJs({ dict_converter: Object.fromEntries });
    proxy?.destroy?.();
    return value;
  };

  function begin(id, silent) {
    interruptBuffer[0] = 0;
    current = { id, silent, capped: false };
    decoder = new TextDecoder(); pending = ""; total = 0;
  }

  return {
    run({ id, code }) {
      begin(id, false);
      let res;
      try { res = call("run_visible", code); }
      catch (e) { res = { ok: false, kind: "Internal", text: String(e) }; }
      flush();
      const capped = current.capped;
      current = null;
      post({ type: "result", id, ...res, capped });
    },
    grade({ id, code, rule, starter, inputs, attempt }) {
      begin(id, true);
      let res;
      try { res = JSON.parse(call("grade_json", code, JSON.stringify(rule), starter || "", JSON.stringify(inputs || []), attempt || 1)); }
      catch (e) { res = { passed: false, feedback: "Something went wrong while checking your code. Try running it again.", internal: String(e) }; }
      current = null;
      post({ type: "graded", id, ...res });
    },
  };
}
```

**Step 4: Run it to check that it passes**

Run: `node --test tests/worker-core.test.js tests/harness.test.js`
Expected: all pass, and the Stop test finishes in under 3 s.

**Step 5: Commit**

```bash
git add src/python/worker-core.js src/python/grading.py tests/helpers/python.js tests/worker-core.test.js
git commit -m "Add the Python core: streaming output, input() requests, output cap and Stop"
```

---

### Task 5: Browser worker and main-thread runner

**Files:**
- Create: `src/python/py.worker.js`
- Create: `src/python/runner.js`
- Test: `tests/runner.test.js` (feature detection and status only; the browser path is checked in Task 15)

**Step 1: Write the failing test**

```js
// tests/runner.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { pythonSupported, pythonStatus } from "../src/python/runner.js";

test("Python needs cross-origin isolation, module workers and WebAssembly", () => {
  // Node has no Worker global or crossOriginIsolated, so this must say unsupported.
  assert.equal(pythonSupported(), false);
});

test("status starts idle", () => {
  assert.equal(pythonStatus(), "idle");
});
```

**Step 2: Run it to check that it fails**

Run: `node --test tests/runner.test.js`
Expected: FAIL (module not found).

**Step 3: Implement**

```js
// src/python/py.worker.js
// One module worker for the whole app: loads Pyodide once, then runs and grades on request.
import { loadPyodide } from "pyodide";
import harness from "./harness.py?raw";
import grading from "./grading.py?raw";
import { createPythonCore } from "./worker-core.js";
import { waitForAnswer } from "./input-channel.js";
import { PYODIDE_PATH } from "./config.js";

const nap = new Int32Array(new SharedArrayBuffer(4));   // Atomics.wait target for time.sleep
let core;

self.onmessage = async ({ data }) => {
  if (data.type === "init") {
    try {
      core = await createPythonCore({
        loadPyodide,
        indexURL: new URL(PYODIDE_PATH.slice(1), new URL(import.meta.env.BASE_URL, self.location.origin)).href,
        sources: { harness, grading },
        post: m => self.postMessage(m),
        readInput: () => waitForAnswer(data.input),
        sleepMs: ms => Atomics.wait(nap, 0, 0, ms),
        interruptBuffer: new Int32Array(data.interrupt),
      });
      self.postMessage({ type: "ready" });
    } catch (e) {
      self.postMessage({ type: "fatal", msg: String(e) });
    }
  } else if (data.type === "run") core.run(data);
  else if (data.type === "grade") core.grade(data);
};
```

```js
// src/python/runner.js
// The game's door to Python. One worker is shared by every room; it starts loading on warmUp().
import { INPUT_BUFFER_BYTES, sendAnswer, cancelInput, resetInput } from "./input-channel.js";

export const RUN_TIME_LIMIT_MS = 10_000;
export const GRADE_TIME_LIMIT_MS = 8_000;   // a whole grading pass; each hidden run also has its own limit
const STOP_GRACE_MS = 1_000;               // if an interrupt is swallowed, restart the worker

let worker = null, ready = null, status = "idle", interrupt = null, inputBox = null, active = null, nextId = 1;
const listeners = new Set();
const setStatus = s => { status = s; listeners.forEach(f => f(s)); };

export function pythonSupported() {
  return typeof Worker !== "undefined" && typeof WebAssembly === "object"
    && typeof SharedArrayBuffer !== "undefined" && globalThis.crossOriginIsolated === true;
}
export const pythonStatus = () => status;
export function onPythonStatus(f) { listeners.add(f); return () => listeners.delete(f); }

function spawn() {
  worker = new Worker(new URL("./py.worker.js", import.meta.url), { type: "module" });
  interrupt = new Int32Array(new SharedArrayBuffer(4));
  inputBox = new SharedArrayBuffer(INPUT_BUFFER_BYTES);
  setStatus("loading");
  ready = new Promise((resolve, reject) => {
    worker.onmessage = ({ data }) => {
      if (data.type === "ready") { setStatus("ready"); resolve(); }
      else if (data.type === "fatal") { setStatus("unavailable"); reject(new Error(data.msg)); }
      else active?.onMessage(data);
    };
    worker.onerror = e => { setStatus("unavailable"); reject(new Error(e.message || "Python worker failed to start")); };
  });
  ready.catch(() => {});
  worker.postMessage({ type: "init", interrupt: interrupt.buffer, input: inputBox });
  return ready;
}

function restart() {
  worker?.terminate();
  worker = null; ready = null; active = null;
  spawn();
}

// Starts loading Python in the background. Rejects if this device can't run it.
export function warmUp() {
  if (!pythonSupported()) { setStatus("unavailable"); return Promise.reject(new Error("unsupported")); }
  return ready || spawn();
}

const newId = () => `${nextId++}-${Math.random().toString(36).slice(2)}`;

// Runs code for the kid to see.
// Resolves to { ok, kind, msg, line, text, capped, stdout, inputs, stopped, timedOut }.
export async function runCode(code, { onOutput = () => {}, onInputRequest = () => {} } = {}) {
  await warmUp();
  const id = newId(), inputs = [];
  let stdout = "";
  return new Promise(resolve => {
    let stopReason = null, grace = null;
    const limit = setTimeout(() => stop("timeout"), RUN_TIME_LIMIT_MS);
    function finish(res) {
      clearTimeout(limit); clearTimeout(grace); active = null;
      resolve({ ...res, stdout, inputs, stopped: stopReason === "stop", timedOut: stopReason === "timeout" });
    }
    function stop(reason) {
      if (stopReason) return;
      stopReason = reason;
      Atomics.store(interrupt, 0, 2);
      cancelInput(inputBox);
      grace = setTimeout(() => { restart(); finish({ ok: false, kind: "Stopped", restarted: true }); }, STOP_GRACE_MS);
    }
    active = {
      id, stop,
      answer(text) { inputs.push(text); stdout += text + "\n"; onOutput(text + "\n", "input"); sendAnswer(inputBox, text); },
      onMessage(m) {
        if (m.id !== id) return;
        if (m.type === "stdout") { stdout += m.text; onOutput(m.text, "stdout"); }
        else if (m.type === "input") onInputRequest();
        else if (m.type === "result") finish(m);
      },
    };
    resetInput(inputBox);   // drop a Stop or answer left from the last run; the worker is idle now
    worker.postMessage({ type: "run", id, code });
  });
}
export const stopCode = () => active?.stop?.("stop");
export const answerInput = text => active?.answer?.(text);

// Hidden grading pass. Resolves to { passed, feedback, failures, timedOut? }.
export async function gradeCode(code, { rule, starter = "", inputs = [], attempt = 1 }) {
  await warmUp();
  const id = newId();
  return new Promise(resolve => {
    let grace = null;
    const limit = setTimeout(() => {
      Atomics.store(interrupt, 0, 2);
      grace = setTimeout(() => { restart(); resolve({ passed: false, timedOut: true,
        feedback: "Checking your program took too long. Look for a loop that never stops." }); }, STOP_GRACE_MS);
    }, GRADE_TIME_LIMIT_MS);
    active = { id, onMessage(m) {
      if (m.id === id && m.type === "graded") { clearTimeout(limit); clearTimeout(grace); active = null; resolve(m); }
    } };
    worker.postMessage({ type: "grade", id, code, rule, starter, inputs, attempt });
  });
}
```

**Step 4: Run the tests and the build**

Run: `npm test && npx vite build --outDir /tmp/cq-build --emptyOutDir`
Expected: tests pass, and the build emits a worker chunk (`assets/py.worker-*.js`) plus the pyodide folder.

**Step 5: Commit**

```bash
git add src/python/py.worker.js src/python/runner.js tests/runner.test.js
git commit -m "Add the browser worker and main-thread runner (Stop, time limit, input, restart)"
```

---

## Stage 2: Output panel, input, Stop, errors and fallback

### Task 6: Friendly errors

**Files:**
- Create: `src/python/friendly.js` (port of `docs/plans/pyodide-prototype/friendly.mjs`)
- Test: `tests/friendly.test.js`

**Step 1: Write the failing test.** It uses real results from the Python core, so it tracks Python's real wording.

```js
// tests/friendly.test.js
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { makeCore } from "./helpers/python.js";
import { friendlyError } from "../src/python/friendly.js";

let t;
before(async () => { t = await makeCore(); });
const explain = code => friendlyError(t.run(code).find(m => m.type === "result"), code);

const cases = [
  ["x = 5\nif x > 3\n    print('big')", 2, /needs a colon :/],
  ["print('hello)", 1, /never closes it/],
  ["print('hi'", 1, /never gets closed/],
  ["if True:\nprint('hi')", 2, /pushed in with 4 spaces/],
  ["  print('hi')", 1, /shouldn't be/],
  ["score = 10\nprint(scre)", 2, /Did you mean score\?/],
  ["print(Hello)", 1, /put them in quotes: print\("Hello"\)/],
  ["age = 10\nprint('I am ' + age)", 2, /str\(\)/],
  ["print(10 / 0)", 1, /divides by zero/],
  ["items = ['a']\nprint(items[1])", 2, /start counting at 0/],
  ["d = {'hp': 3}\nprint(d['xp'])", 2, /doesn't have it/],
  ["n = int('abc')", 1, /int\(\) can only turn digits/],
  ["'hi'.uper()", 1, /Did you mean \.upper\(\)\?/],
  ["def f():\n    return f()\nf()", 2, /keeps calling itself/],
];
for (const [code, line, message] of cases) test(`explains: ${code.split("\n").pop()}`, () => {
  const f = explain(code);
  assert.equal(f.line, line);
  assert.match(f.headline, message);
  assert.ok(f.python.length > 0, "keeps Python's own words for 'What Python said'");
});

test("a stopped run explains the time limit, the Stop button and the output cap", () => {
  assert.match(friendlyError({ ok: false, kind: "Stopped", timedOut: true }, "").headline, /10 seconds/);
  assert.match(friendlyError({ ok: false, kind: "Stopped", stopped: true }, "").headline, /You stopped/);
  assert.match(friendlyError({ ok: false, kind: "Stopped", capped: true }, "").headline, /printed so much/);
});

test("an unknown error falls back to Python's own words", () => {
  const f = friendlyError({ ok: false, kind: "OverflowError", line: 1, text: "OverflowError: math range error" }, "x");
  assert.match(f.headline, /OverflowError: math range error/);
});

test("a successful run has nothing to explain", () => {
  assert.equal(friendlyError({ ok: true }, ""), null);
});
```

**Step 2: Run it to check that it fails**

Run: `node --test tests/friendly.test.js`
Expected: FAIL (module not found).

**Step 3: Implement.** Port `friendly.mjs`, keeping every rule and the `SURPRISING` set, with these changes:
1. Return `{ headline, line, code, python }`, where `python` is `r.text || r.msg`.
2. Replace the `Timeout` rule with a check at the top for `kind === "Stopped"`, which uses `stoppedMessage` (below).
3. For "expected an indented block", the result's `line` is the line *after* the colon. Keep `r.line` as the line, and say "Line {r.line} needs to be pushed in with 4 spaces, because the line before it ends with a colon."

```js
// src/python/friendly.js
// Turns a run result into a message for a 9-12 year old, keyed on Python's own wording
// (pinned Pyodide version; see src/python/config.js). Python's real words are kept for "What Python said".
const SURPRISING = new Set(["help", "id", "iter", "hex", "oct", "ord", "chr", "dir", "vars", "hash", "exit", "quit",
  "open", "copyright", "credits", "license", "all", "any", "abs"]);

export function friendlyError(r, code) {
  if (!r || r.ok) return null;
  if (r.kind === "Stopped") return { headline: stoppedMessage(r), line: null, code: "", python: "" };
  const lines = code.split("\n");
  const n = r.line, src = n ? (lines[n - 1] || "").trim() : "";
  const at = n ? `Line ${n}` : "Your code";
  const text = r.text || r.msg || "";
  for (const [kind, when, say] of rules(r, text, at, src, n)) {
    if (kind.test(r.kind) && when()) return { headline: say(), line: n, code: src, python: text };
  }
  return { headline: `${at}: ${text}`, line: n, code: src, python: text };
}

function stoppedMessage(r) {
  if (r.capped) return "Your program printed so much that I stopped it. Is a print() stuck inside a loop that never ends?";
  if (r.timedOut) return "Your program was still running after 10 seconds, so I stopped it. Is there a loop that never ends? A while loop needs something inside it that makes the condition False, or a break.";
  return "You stopped the program.";
}

// rules(): the prototype's rule table (friendly.mjs), minus the Timeout rule, as a function of (r, text, at, src, n).
```

**Step 4: Run it to check that it passes**

Run: `node --test tests/friendly.test.js`
Expected: all pass.

**Step 5: Commit**

```bash
git add src/python/friendly.js tests/friendly.test.js
git commit -m "Add kid-friendly error messages keyed on Python's real wording"
```

---

### Task 7: The run-then-grade flow (pure, with fallback)

**Files:**
- Create: `src/python/flow.js`
- Test: `tests/flow.test.js`

**Step 1: Write the failing test.** It uses fake runners, so it needs no Pyodide.

```js
// tests/flow.test.js
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
  assert.equal(r.mode, "python"); assert.equal(r.passes, true);
  assert.deepEqual(r.graded.opts, { rule, starter: challenge.starterCode, inputs: ["Alex"], attempt: 2 });
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
  assert.equal(r.passes, false); assert.match(r.error.headline, /stopped/);
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

test("a challenge without a rule uses the keyword grader after running", async () => {
  const r = await runAndGrade({ code: "print(1)", challenge, rule: undefined, attempt: 1, fallbackGrade,
    runner: fakeRunner({ ok: true, stdout: "1\n", inputs: [] }, {}) });
  assert.equal(r.mode, "python"); assert.equal(r.feedback, "keyword ok");
});
```

**Step 2: Run it to check that it fails**

Run: `node --test tests/flow.test.js`
Expected: FAIL (module not found).

**Step 3: Implement**

```js
// src/python/flow.js
// What happens when the kid presses Run: run the code for real, then grade it quietly.
// Falls back to the keyword grader when this device can't run Python.
import { friendlyError } from "./friendly.js";

export async function runAndGrade({ code, challenge, rule, attempt, runner, fallbackGrade, onOutput, onInputRequest }) {
  const fallback = () => ({ mode: "fallback", ...pick(fallbackGrade(code, challenge, attempt)) });
  if (!runner.available()) return fallback();
  let run;
  try { run = await runner.run(code, { onOutput, onInputRequest }); }
  catch { return fallback(); }
  if (!run.ok) return { mode: "python", passes: false, run, error: friendlyError(run, code) };
  if (!rule) return { mode: "python", run, ...pick(fallbackGrade(code, challenge, attempt)) };
  const graded = await runner.grade(code, { rule, starter: challenge.starterCode || "", inputs: run.inputs || [], attempt });
  return { mode: "python", run, graded, passes: !!graded.passed, feedback: graded.feedback };
}

const pick = r => ({ passes: !!r.passes, feedback: r.feedback, keywordError: r.error || null });
```

**Step 4: Run it to check that it passes**

Run: `node --test tests/flow.test.js`
Expected: 6 pass.

**Step 5: Commit**

```bash
git add src/python/flow.js tests/flow.test.js
git commit -m "Add the run-then-grade flow with keyword-grader fallback"
```

---

### Task 8: UI: editor gutter, output panel, input box and Stop, in both rooms

**Files:**
- Create: `src/python/CodePanel.jsx`
- Create: `src/checks.js` (placeholder)
- Modify: `src/App.jsx`:
  - `ChallengeRoom`: `handleRun`, the editor textarea and the OUTPUT block
  - `GrindingZone`
  - `WorldMap`: warm up Python on mount
- Test: no automated test. There's no React test harness, and the logic is already tested in `flow.js`, `runner.js` and `friendly.js`. The browser check is in Task 15.

**Step 1: Create `src/python/CodePanel.jsx`.** Match the existing editor and panel look: use the tokens from `../theme.js` and Tailwind classes as `App.jsx` does.

```jsx
// src/python/CodePanel.jsx
// The code editor (with line numbers) and the OUTPUT panel (real output, input box, errors, feedback).
import React, { useRef, useState, useEffect } from "react";
import { DARK, ACCENT, GOLD, TEXT, DIM, ERR, MONO } from "../theme.js";
import { handleCodeKeyDown, CODE_TEXTAREA_PROPS } from "../editor.js";
import { pythonSupported, pythonStatus, runCode, gradeCode } from "./runner.js";

export const PYTHON_RUNNER = {
  available: () => pythonSupported() && pythonStatus() !== "unavailable",
  run: runCode,
  grade: gradeCode,
};

// Output parts: [{ kind: "stdout" | "input", text }]; consecutive parts of one kind are merged.
export function appendPart(parts, text, kind) {
  const last = parts[parts.length - 1];
  return last && last.kind === kind ? [...parts.slice(0, -1), { kind, text: last.text + text }] : [...parts, { kind, text }];
}

export function CodeEditor({ code, setCode, onRun, minHeight = 140 }) {
  const gutter = useRef(null);
  const count = Math.max(1, code.split("\n").length);
  return <div className="flex-1 flex rounded-lg overflow-hidden" style={{ background: DARK, border: "1px solid #ffffff11", minHeight }}>
    <div ref={gutter} aria-hidden="true" className="select-none text-right py-4 pl-3 pr-2 overflow-hidden"
      style={{ color: "#4a556888", fontFamily: MONO, fontSize: "13px", lineHeight: "1.6" }}>
      {Array.from({ length: count }, (_, i) => <div key={i}>{i + 1}</div>)}
    </div>
    <textarea value={code} onChange={e => setCode(e.target.value)} onKeyDown={e => handleCodeKeyDown(e, onRun)}
      onScroll={e => { if (gutter.current) gutter.current.scrollTop = e.currentTarget.scrollTop; }}
      {...CODE_TEXTAREA_PROPS} wrap="off" aria-label="Python code"
      className="flex-1 w-full py-4 pr-4 resize-none focus:outline-none"
      style={{ background: DARK, color: "#e6e6e6", fontFamily: MONO, fontSize: "13px", lineHeight: "1.6", caretColor: ACCENT }}
      placeholder="# Write your Python code here..." />
  </div>;
}

export function OutputPanel({ status, parts, waitingForInput, onAnswer, error, feedback, passed, fallbackNote }) {
  const [answer, setAnswer] = useState("");
  const inputRef = useRef(null);
  useEffect(() => { if (waitingForInput) inputRef.current?.focus(); }, [waitingForInput]);
  const printed = parts.length > 0;
  return <div>
    {status === "loading" && !printed && <div className="text-sm" style={{ color: ACCENT }}>⟳ Waking up Python…</div>}
    {(printed || waitingForInput) && <pre className="p-3 rounded text-sm whitespace-pre-wrap mb-2"
      style={{ background: DARK, color: "#e6e6e6", border: "1px solid #ffffff11", fontFamily: MONO, maxHeight: 260, overflow: "auto" }}>
      {parts.map((p, i) => <span key={i} style={{ color: p.kind === "input" ? ACCENT : undefined }}>{p.text}</span>)}
      {waitingForInput && <form className="inline" onSubmit={e => { e.preventDefault(); onAnswer(answer); setAnswer(""); }}>
        <input ref={inputRef} value={answer} onChange={e => setAnswer(e.target.value)} aria-label="Type your answer, then press Enter"
          {...{ autoCapitalize: "off", autoCorrect: "off", autoComplete: "off", spellCheck: false }}
          className="bg-transparent outline-none" style={{ color: ACCENT, fontFamily: MONO, borderBottom: `1px solid ${ACCENT}66`, minWidth: "8ch" }} />
      </form>}
    </pre>}
    {error && <div className="p-3 rounded text-sm mb-2" style={{ background: "#ff6b6b11", color: ERR, border: "1px solid #ff6b6b33" }}>
      <div>❌ {error.headline}</div>
      {error.code && <pre className="mt-2 text-xs whitespace-pre-wrap" style={{ fontFamily: MONO, color: TEXT }}>{error.line ? `${error.line} | ` : ""}{error.code}</pre>}
      {error.python && <details className="mt-2 text-xs"><summary className="cursor-pointer" style={{ color: DIM }}>What Python said</summary>
        <pre className="mt-1 whitespace-pre-wrap" style={{ fontFamily: MONO, color: DIM }}>{error.python}</pre></details>}
    </div>}
    {feedback && <div className="p-3 rounded text-sm" style={{ background: passed ? `${ACCENT}11` : `${GOLD}11`, color: passed ? ACCENT : GOLD,
      border: `1px solid ${passed ? `${ACCENT}33` : `${GOLD}33`}` }}>{passed ? "🎉" : "💭"} {feedback}</div>}
    {fallbackNote && <div className="text-xs mt-2" style={{ color: DIM }}>This device can't run Python here, so I checked your code without running it.</div>}
  </div>;
}
```

**Step 2: Placeholder `src/checks.js`** (Tasks 11-12 fill it in):

```js
// src/checks.js
// Per-challenge grading rules, applied inside Python by src/python/grading.py.
// A rule: { output: [check], concepts?: [check], probes?: [check], inputs?: [str], seed?: int }
// A check: { expr: "<Python expression>", hint?: "<what to tell the kid if it fails>" }
export const CHECKS = {};
```

**Step 3: Wire up `ChallengeRoom`.**
- Imports: `CodeEditor, OutputPanel, PYTHON_RUNNER, appendPart` from `./python/CodePanel.jsx`; `runAndGrade` from `./python/flow.js`; `stopCode, answerInput, onPythonStatus, pythonStatus` from `./python/runner.js`; `CHECKS` from `./checks.js`.
- State: `parts` (`[]`), `waiting` (`false`), `result` (`null`), `pyStatus` (initialised from `pythonStatus()` and kept current with `useEffect(() => onPythonStatus(setPyStatus), [])`).
- Replace the textarea with `<CodeEditor code={code} setCode={setCode} onRun={handleRun} />`.
- While `isRunning`, the Run `Btn` reads `■ Stop` and its `onClick` becomes `stopCode`. It must stay enabled while running.
- Replace the OUTPUT block contents with `<OutputPanel status={pyStatus} parts={parts} waitingForInput={waiting} onAnswer={t=>{answerInput(t);setWaiting(false)}} error={result?.error} feedback={result?.feedback} passed={result?.passes} fallbackNote={result?.mode==="fallback"} />`. In fallback mode, also show `result.keywordError` inside `error`, as `{headline: result.keywordError}`, when it is set.
- Replace the body of `handleRun`:

```jsx
  const handleRun=async()=>{
    if(isRunning||passed)return;
    setIsRunning(true);setParts([]);setResult(null);setWaiting(false);
    try{
      const r=await runAndGrade({code,challenge,rule:CHECKS[challenge.id],attempt:attempts.length+1,
        fallbackGrade:validateOffline,runner:PYTHON_RUNNER,
        onOutput:(text,kind)=>setParts(p=>appendPart(p,text,kind)),
        onInputRequest:()=>setWaiting(true)});
      setWaiting(false);setResult(r);
      setAttempts(prev=>[...prev,{code,feedback:r.feedback,passed:r.passes}]);
      if(r.passes){setPassed(true);try{SFX.codeSuccess()}catch(e){};try{Music.playVictory()}catch(e){};setTimeout(()=>setShowVictory(true),500);}
      else{try{SFX.codeFail()}catch(e){}}
    }finally{setIsRunning(false)}
  };
```

- Remove the old `output` state and its rendering.

**Step 4: Wire up `GrindingZone` the same way.** Store the picked challenge's index in state, because `GRIND_CHALLENGES` entries have no id, and pass `rule: CHECKS[\`grind_${index}\`]` and `challenge: { ...challenge, id: \`grind_${index}\` }`. There's no victory overlay; keep the existing ✅/❌ header driven by `result.passes`.

**Step 5: Warm up Python on the map.** In `WorldMap`, add `useEffect(()=>{warmUp().catch(()=>{})},[])` (import `warmUp` from `./python/runner.js`).

**Step 6: Build and smoke-test**

Run: `npm test && npx vite build --outDir /tmp/cq-build --emptyOutDir`
Expected: tests pass and the build succeeds. The full browser check is Task 15. For a quick check now, run `npm run dev`, open a room and press Run. Real output should appear, or "Waking up Python…" first.

**Step 7: Commit**

```bash
git add src/python/CodePanel.jsx src/checks.js src/App.jsx
git commit -m "Show real output, input box, Stop and friendly errors in rooms and practice"
```

---

## Stage 3: Grading

### Task 9: `grading.py`, the rule engine (ported from the prototype)

**Files:**
- Modify: `src/python/grading.py` (replace the placeholder)
- Test: `tests/grading-engine.test.js`

**Step 1: Write the failing test**

```js
// tests/grading-engine.test.js
import { test, before, describe } from "node:test";
import assert from "node:assert/strict";
import { makeCore } from "./helpers/python.js";

let t;
before(async () => { t = await makeCore(); });
const grade = (code, rule, { starter = "", inputs = [], attempt = 1 } = {}) => {
  t.messages.length = 0;
  t.core.grade({ id: "g1", code, rule, starter, inputs, attempt });
  return t.messages.find(m => m.type === "graded");
};
const HELLO = { output: [{ expr: "lines(['Hello, World!'])" }] };

describe("output checks and near misses", () => {
  test("exact output passes", () => assert.equal(grade('print("Hello, World!")', HELLO).passed, true));
  test("wrong capitals and punctuation is a near miss that names the line", () => {
    const g = grade('print("hello, world")', HELLO);
    assert.equal(g.passed, false);
    assert.match(g.feedback, /Line 1 of your output says `hello, world` — so close! Check your capital letters and punctuation\./);
  });
  test("trailing spaces and extra blank lines are ignored", () =>
    assert.equal(grade('print("Hello, World!   ")\nprint()', HELLO).passed, true));
  test("an em dash typed as a hyphen counts as equal", () =>
    assert.equal(grade('print("Alex - Level 5")', { output: [{ expr: "lines(['Alex — Level 5'])" }] }).passed, true));
  test("missing lines say how many are needed", () => {
    const g = grade('print("I am a coder")', { output: [{ expr: "lines(['I am a coder','I am brave','I am ready'])" }] });
    assert.match(g.feedback, /printed 1 line, but the task needs 3/);
  });
  test("a custom hint is used when given", () => {
    const g = grade('print(1)', { output: [{ expr: "nums([42])", hint: "Print the sum of a and b." }] });
    assert.equal(g.feedback, "Print the sum of a and b.");
  });
});

describe("concepts and probes", () => {
  const RULE = {
    output: [{ expr: "lines(['42'])" }],
    probes: [{ expr: "rerun({'a': '1', 'b': '2'})[0] == ['3']", hint: "Work it out from a and b: print(a + b)." }],
    concepts: [{ expr: "binop('Add') >= 1", hint: "Use + to add them." }],
  };
  test("a real calculation passes", () => assert.equal(grade("a = 15\nb = 27\nprint(a + b)", RULE).passed, true));
  test("typing the answer fails the probe with its hint", () => {
    const g = grade("a = 15\nb = 27\nprint(42)", RULE);
    assert.equal(g.passed, false); assert.match(g.feedback, /Work it out from a and b/);
  });
  test("later attempts show up to two hints", () => {
    const g = grade("print(42)", RULE, { attempt: 3 });
    assert.match(g.feedback, /Use \+/); assert.match(g.feedback, /Work it out/);
  });
});

describe("hidden runs are safe", () => {
  test("a hidden re-run that loops forever is stopped by the time limit", () => {
    const code = "n = 6\nwhile n != 0:\n    n -= 2\nprint('done')";   // rerun with n = 3 never reaches 0
    const g = grade(code, { output: [{ expr: "True" }], probes: [{ expr: "rerun({'n': '3'})[0] == ['done']", hint: "Make sure your loop always stops." }] });
    assert.equal(g.passed, false); assert.match(g.feedback, /never finished|always stops/);
  });
  test("kid code can't catch the time limit with a bare except", () => {
    const code = "try:\n    while True:\n        pass\nexcept:\n    pass\nprint('escaped')";
    assert.equal(grade(code, { output: [{ expr: "lines(['escaped'])" }] }).passed, false);
  });
  test("recorded input is replayed", () => {
    const g = grade('name = input("Name? ")\nprint("Hi", name)', { output: [{ expr: "L == ['Name? Alex', 'Hi Alex']" }] }, { inputs: ["Alex"] });
    assert.equal(g.passed, true, g.feedback);
  });
  test("random is seeded for grading so results repeat", () => {
    const rule = { output: [{ expr: "True" }], probes: [{ expr: "rerun()[0] == L", hint: "x" }] };
    assert.equal(grade("import random\nprint(random.randint(1, 10**9))", rule).passed, true);
  });
  test("time.sleep is instant while grading", () => {
    const started = Date.now();
    grade("import time\ntime.sleep(5)\nprint('ok')", { output: [{ expr: "lines(['ok'])" }] });
    assert.ok(Date.now() - started < 2000);
  });
});
```

**Step 2: Run it to check that it fails**

Run: `node --test tests/grading-engine.test.js`
Expected: FAIL (the placeholder says "Grading is not ready yet.").

**Step 3: Implement `src/python/grading.py`.** Port `docs/plans/pyodide-prototype/checklib.py` with these changes.

1. **Shared helpers.** `harness.py` has already run in the same Pyodide globals, so call `clean_slate`, `fresh_main`, `run_as_main`, `leave_main`, `compile_kid`, `KID_FILE`, `RUN_CODE` and `StopRun` directly. Don't import them. (The runner hardening after Task 5 replaced Task 3's `fresh_namespace` with `fresh_main`, `run_as_main` and `leave_main`. Their docstrings in `harness.py` say what each one does.)
2. **`Run`** (prototype lines 25-75):
   - Call `clean_slate(seed=seed)` first, then set `time.sleep = lambda s: None`.
   - Replace the prototype's `ns = {"__name__": "__main__"}` with `main = fresh_main()` and `ns = main.__dict__`. Keep `ns` for the probes.
   - Compile with `compile_kid` (or `compile(tree, KID_FILE, "exec")` for reruns), and trace frames whose `co_filename == KID_FILE`.
   - Capture stdout with the `CappedIO` class below.
   - Replace the bare `RUN_CODE(compiled, ns)` with `run_as_main(compiled, main)`. Keep it inside the profiler and the stdout redirect, and wrap it in `_arm(2)` / `_disarm()`. A bare `RUN_CODE` would skip the protections `run_visible` has: the kid gets their own `__main__`, and builtins and the recursion limit are put back before grading's own code runs.
   - Putting builtins back in `run_as_main`'s `finally` also undoes `builtins.input = fake_input`. So set `fake_input` before the call, as the prototype does, and set it again in any probe that calls a kid function that should get scripted input.
   - `run_as_main` leaves the kid's module as `__main__`. Building `self.error` runs the error's `__str__`, and probes call kid functions; both should see the kid's own module, as in real Python. So don't call `leave_main()` in `Run`: `grade_json` calls it once grading is done (item 9).
   - Set `self.timed_out = True` when `StopRun` escapes.
   - Keep the prototype's scripted `fake_input` and patches.

   ```python
   class CappedIO(io.StringIO):
       LIMIT = 200_000
       def write(self, s):
           if self.tell() + len(s) > self.LIMIT:
               raise StopRun("output limit")
           return super().write(s)
   ```

3. **Watchdog.** It is sticky: once the deadline passes it keeps raising, so a bare `except:` can't escape it. The events fire in every frame, including the roughly 160 in `run_as_main`'s clean-up. So `_tick` skips the harness's own code. Otherwise, a program that ends just as time runs out takes a `StopRun` in that clean-up and keeps its broken builtins: measured in 161 of 1024 tick phases.

   ```python
   _MON = sys.monitoring
   _TOOL = 4
   _deadline = [0.0]
   _ticks = [0]
   _OURS = run_as_main.__code__.co_filename   # harness.py's code, and this file's (both run through runPython)
   def _tick(code, *_):
       if code.co_filename == _OURS:
           return
       _ticks[0] += 1
       if _ticks[0] & 1023 == 0 and time.monotonic() > _deadline[0]:
           raise StopRun("time limit")
   _MON.use_tool_id(_TOOL, "codequest-grading")
   _MON.register_callback(_TOOL, _MON.events.JUMP, _tick)
   _MON.register_callback(_TOOL, _MON.events.PY_START, _tick)
   def _arm(seconds):
       _deadline[0] = time.monotonic() + seconds
       _MON.set_events(_TOOL, _MON.events.JUMP | _MON.events.PY_START)
   def _disarm():
       _MON.set_events(_TOOL, 0)
   ```

4. **`Ctx` and every `h_*` helper** (prototype lines 78-434) are copied verbatim, because the rules use these names. Two changes:
   - `h_call`, `h_callf` and `h_callt` also run under `_arm(2)` / `_disarm()` with a `CappedIO`.
   - `h_rerun` passes the rule's seed through.
5. **Normalization.** `norm_lines` works as in the prototype, plus a `SAME` translation: `—` and `–` become `-`, curly quotes become straight, and `°` becomes nothing. `h_lines`, `h_subseq` and `h_has` apply `SAME` to both the kid's lines and the expected strings, so a rule written with `—` accepts a typed `-`.
6. **Near-miss feedback.** For an output check whose `expr` is literally `lines([...string literals...])` (detect it with `ast.parse(expr, mode="eval")`), build the message from the first difference:
   - different line counts: "Your program printed {n} line{s}, but the task needs {m}."
   - the lines match after lowercasing and stripping punctuation: "Line {k} of your output says \`{got}\` — so close! Check your capital letters and punctuation."
   - otherwise: "Line {k} of your output says \`{got}\`. Compare it with what the task asks for."
7. **Default hints**, used when a check has no `hint`:
   - output: "Your output doesn't match what the task asks for yet. Read the task again and compare it with what your program printed."
   - concepts: "The task asks you to use a particular Python tool. Read the task again."
   - probes: "Your program printed the right answer, but it didn't change when I tried different values. Try calculating the answer with your variables instead of typing it in."
   - a hidden run that timed out: "When I tested your program with different values, it never finished. Check your loops." This replaces the check's hint.
8. **Evaluation order:** output, then concepts, then probes. `evaluate(code, rule, starter, stdin_lines, seed)` returns `[{group, index, message}]`, with at most one failure per group. If the first run itself fails or times out, return only that failure.
9. **Entry point:**

   ```python
   import json

   def grade_json(code, rule_json, starter, inputs_json, attempt):
       rule = json.loads(rule_json)
       try:
           failures = evaluate(code, rule, starter=starter, stdin_lines=rule.get("inputs") or json.loads(inputs_json), seed=rule.get("seed", 0))
       finally:
           leave_main()                   # run_as_main left the kid's module as __main__ for the probes
       if not failures:
           return json.dumps({"passed": True, "feedback": "Great work! Your program does exactly what the task asks. 🎉", "failures": []})
       shown = [f["message"] for f in failures][: 2 if attempt >= 3 else 1]
       return json.dumps({"passed": False, "feedback": " ".join(shown), "failures": failures})
   ```

**Step 4: Run it to check that it passes**

Run: `node --test tests/grading-engine.test.js && npm test`
Expected: all pass.

**Step 5: Commit**

```bash
git add src/python/grading.py tests/grading-engine.test.js
git commit -m "Add the Python grading engine: output checks with near misses, concepts, safe hidden re-runs"
```

---

### Task 10: Rule contract and coverage tests

**Files:**
- Test: `tests/checks.test.js`
- Test: `tests/grading.test.js` (the 133-challenge regression suite)
- Create: `tests/fixtures/alternatives/` and `tests/fixtures/wrong/`, seeded from the prototype's `cases/` and `wrong/`

**Step 1: Write the tests.** They stay red until Tasks 11-12 fill `CHECKS`.

```js
// tests/checks.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { CHECKS } from "../src/checks.js";
import { CHAPTERS, GRIND_CHALLENGES } from "../src/content.js";

const ids = [...CHAPTERS.flatMap(c => [...c.rooms.map(r => r.id), c.boss.id]), ...GRIND_CHALLENGES.map((_, i) => `grind_${i}`)];
const KEYS = new Set(["output", "concepts", "probes", "inputs", "seed"]);

test("every challenge has a rule", () => assert.deepEqual(ids.filter(id => !CHECKS[id]), []));
test("no rule for an unknown challenge", () => assert.deepEqual(Object.keys(CHECKS).filter(id => !ids.includes(id)), []));
for (const [id, rule] of Object.entries(CHECKS)) test(`${id}: rule shape`, () => {
  for (const k of Object.keys(rule)) assert.ok(KEYS.has(k), `unknown key ${k}`);
  assert.ok(rule.output?.length, "at least one output check");
  for (const group of ["output", "concepts", "probes"]) for (const c of rule[group] || []) {
    assert.equal(typeof c.expr, "string");
    if (group !== "output") assert.ok(c.hint && c.hint.length > 10, `${group} checks need a kid-facing hint`);
  }
});
```

```js
// tests/grading.test.js
// Regression suite: every challenge graded for real in Pyodide.
import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { makeCore } from "./helpers/python.js";
import { CHECKS } from "../src/checks.js";
import { CHAPTERS, GRIND_CHALLENGES } from "../src/content.js";

const challenges = [...CHAPTERS.flatMap(c => [...c.rooms, c.boss]), ...GRIND_CHALLENGES.map((g, i) => ({ ...g, id: `grind_${i}` }))];
const fixture = (dir, f) => fs.readFileSync(new URL(`./fixtures/${dir}/${f}`, import.meta.url), "utf8");
const list = dir => fs.readdirSync(new URL(`./fixtures/${dir}/`, import.meta.url)).filter(f => f.endsWith(".py"));

let t;
before(async () => { t = await makeCore(); });
const grade = (c, code) => {
  t.messages.length = 0;
  t.core.grade({ id: "g", code, rule: CHECKS[c.id], starter: c.starterCode || "", inputs: [], attempt: 1 });
  return t.messages.find(m => m.type === "graded");
};

describe("every challenge", () => {
  for (const c of challenges) {
    test(`${c.id}: the reference solution passes`, () => {
      const g = grade(c, fixture("solutions", `${c.id}.py`)); assert.equal(g.passed, true, g.feedback);
    });
    test(`${c.id}: the untouched starter fails`, () => assert.equal(grade(c, c.starterCode || "").passed, false));
    test(`${c.id}: print("hello") fails`, () => assert.equal(grade(c, 'print("hello")').passed, false));
  }
});

describe("alternative correct answers pass", () => {
  for (const f of list("alternatives")) test(f, () => {
    const c = challenges.find(x => x.id === f.split("__")[0]);
    const g = grade(c, fixture("alternatives", f)); assert.equal(g.passed, true, g.feedback);
  });
});

describe("wrong answers fail", () => {
  for (const f of list("wrong")) test(f, () => {
    const c = challenges.find(x => x.id === f.split("__")[0]);
    assert.equal(grade(c, fixture("wrong", f)).passed, false);
  });
});
```

**Step 2: Seed the fixture folders.**
- Copy `docs/plans/pyodide-prototype/cases/*__ALT_*.py` into `tests/fixtures/alternatives/`.
- Copy the other `cases/*.py` into `tests/fixtures/wrong/`.
- Copy `wrong/*.py` into `tests/fixtures/wrong/`, renamed to `<id>__<label>.py` (for example, `ch12_r2_noinc.py` becomes `ch12_r2__noinc.py`). Skip `silent.py`.

**Step 3: Run the tests to confirm they fail as expected**

Run: `node --test tests/checks.test.js`
Expected: FAIL, with "every challenge has a rule" listing all 133 ids.

**Step 4: Commit**

```bash
git add tests/checks.test.js tests/grading.test.js tests/fixtures/alternatives tests/fixtures/wrong
git commit -m "Add the rule contract and the real-Pyodide grading regression suite (red until rules land)"
```

---

### Task 11: Port rules, chapters 1-4 plus grind_0-7 (batch A, from `rules_a.py`)

Tasks 11, 12a and 12b are independent, so run them as **parallel subagents**. Each batch writes its own file, `src/checks/batch-a.js` (or `batch-b.js`, `batch-c.js`), which exports an object. `src/checks.js` combines them: `export const CHECKS = { ...A, ...B, ...C };`.

**Steps:**
1. **Translate each `E(...)`** in `docs/plans/pyodide-prototype/rules_a.py`:
   - `out` → `output: [{ expr }]`
   - `probes` → `probes: [{ expr, hint }]`
   - `ast` entries whose third field is `"task"` → `concepts: [{ expr, hint }]`
   - **Drop** `ast` entries marked `"expectedBehavior"`. The design enforces only what the task text tells the kid.
2. **Write each `hint` for a 10-year-old.** Say what to do in one sentence, and never give away the whole answer. For example:
   - "This room is about f-strings. Put an f before the quotes and your variable in {curly braces}."
   - "Your program should work it out from a and b. Try print(a + b)."
3. **Keep each `expr` exactly as in the prototype**, unless a test proves it wrong. If you change one, add a code comment saying why.
4. **Add test fixtures** for each challenge, and check each one with `python3`:
   - at least 1 alternative correct answer in `tests/fixtures/alternatives/<id>__<label>.py`. It must run cleanly.
   - at least 2 plausible wrong answers in `tests/fixtures/wrong/<id>__<label>.py`: a hardcoded print of the expected output, and the most likely conceptual mistake. Each must be wrong according to the task.
5. **Run** `node --test tests/grading.test.js tests/checks.test.js` and fix until this batch is green:
   - the reference passes;
   - the starter fails;
   - `print("hello")` fails;
   - the alternatives pass;
   - the wrong answers fail.

   If a wrong answer can't be rejected without also rejecting a correct one, keep the rule lenient, delete that wrong fixture and list it in the PR notes.
6. **Commit:** `Grading rules for chapters 1-4 and practice 0-7`.

### Task 12a: Port rules, chapters 5-8 plus grind_8-15 (batch B, from `rules_b.py`)

Same steps as Task 11. Commit: `Grading rules for chapters 5-8 and practice 8-15`.

### Task 12b: Port rules, chapters 9-12 plus grind_16-23 (batch C, from `rules_c.py`)

Same steps as Task 11, plus:
- Robotics challenges keep their print/dict simulations, with no pybricks mock.
- The known content bugs (grind_17, ch12_boss, grind_23) get rules that accept the reference, each with a `// content bug: …` comment.

Commit: `Grading rules for chapters 9-12 and practice 16-23`.

**After all three:** `npm test` must be fully green. That means `checks.test.js` with 133 rules, `grading.test.js` with 133 × 3 plus the fixtures, and everything else.

**Batch verification:** after each batch, an independent verifier:
- re-runs the batch's tests;
- reads every hint, asking whether it's kid-friendly and whether it gives away the answer;
- tries at least 3 extra wrong answers per challenge.

---

## Stage 4: Verify and ship

### Task 13: CI, README and the keyword grader's new role

- `.github/workflows/ci.yml`: set `python-version: "3.14"`.
- `README.md`:
  - Features: say that code really runs.
  - Project structure: add the `src/python/` files, `src/checks.js` and `src/checks/`.
  - Tests: Pyodide tests load from npm and need no network.
- `src/grader.js`: add a header comment saying it's now the fallback for devices that can't run Python.

Run `npm test`, then commit: `CI on Python 3.14; document the Python runner`.

### Task 14: Size and header check on a production build

```bash
npx vite build --outDir /tmp/cq-build --emptyOutDir
du -sh /tmp/cq-build /tmp/cq-build/pyodide
npx vite preview --outDir /tmp/cq-build --port 4173 &
curl -sI http://localhost:4173/ | grep -i cross-origin
curl -sI "http://localhost:4173/assets/$(ls /tmp/cq-build/assets | grep py.worker)" | grep -i cross-origin
```

Expected:
- `pyodide/` is about 13.5 MB.
- Both responses carry COOP `same-origin` and COEP `require-corp`. The worker script needs them too.

Stop the preview server afterwards.

### Task 15: End-to-end browser verification (in-app browser, Chrome)

Use the dev server through `preview_start`; `server.headers` isolates it. Record evidence for each check with a screenshot or `javascript_tool` output.

1. `crossOriginIsolated === true`, and the worker reaches `ready` after the map loads.
2. ch1_r1:
   - `print("hello")` fails, shows its output and gives a near-miss or output hint.
   - `print("Hello, World!")` passes and the victory flow runs.
3. ch1_r3 passes with the starter comment kept. This was the original audit bug.
4. `if x > 3` with no colon shows the headline, the line, the code and a collapsed "What Python said".
5. `input()`: the box appears, the answer is echoed and grading replays it.
6. `while True: pass` stops instantly on ■ Stop, and the next Run works. The 10 s limit also works.
7. A hardcoded ch1_r5 (`print(42)`) gets the probe hint.
8. The Practice Arena runs code and shows output.
9. Fallback: temporarily set `server.headers` to `{}`, restart and reload. The room grades through the keyword grader and shows the fallback note. Restore the headers afterwards.
10. The console has no errors.

Fix anything that fails, using TDD where the fix is testable, and commit.

### Task 16: Clean up, push and preview

1. `git rm -r docs/plans/pyodide-prototype`. Commit: `Remove the Pyodide research prototypes`.
2. Check that `npm test` and the build are green.
3. **Ask Scott before pushing.** Then run `git push -u origin pyodide-runner`, and Vercel builds a preview.
4. Send Scott the preview URL and ask him to try it on the kids' devices (iPad/Safari, a school Chromebook). Ask about:
   - the first-load time;
   - whether Stop and `input()` work;
   - any wrong rejections.
5. **Ask before opening the PR.** The PR body covers:
   - what changed;
   - measured numbers (the `print("hello")` count is 0 with Python);
   - dropped fixtures;
   - the devices tested;
   - follow-ups: a pybricks mock, rewriting the fake-`input()` content, offline caching with a service worker, and the content bugs.

---

## Execution notes

- **Tasks 1-10 run in order**, since each depends on the previous one.
- **Tasks 11, 12a and 12b run in parallel**, each writing its own `src/checks/batch-*.js`.
- **If a Pyodide API doesn't behave as this plan says,** look in `docs/plans/pyodide-prototype/`, where every API used here was demonstrated working. Don't guess.
