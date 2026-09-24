// Runs every reference solution in the same Pyodide build the browser uses,
// through the same harness.py the worker uses.
import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { loadPyodide } from "pyodide";
import { CHAPTERS, GRIND_CHALLENGES } from "../src/content.js";

const DIR = new URL("./fixtures/solutions/", import.meta.url);
const HARNESS = fs.readFileSync(new URL("../src/python/harness.py", import.meta.url), "utf8");
const ids = [
  ...CHAPTERS.flatMap(ch => [...ch.rooms.map(r => r.id), ch.boss.id]),
  ...GRIND_CHALLENGES.map((_, i) => `grind_${i}`),
];

let py, run, out;
before(async () => {
  py = await loadPyodide();
  py.setStdout({ batched: s => out.push(s) });
  py.runPython(HARNESS);
  const fn = py.globals.get("run_submission");
  run = src => { out = []; return { ...fn(src).toJs({ dict_converter: Object.fromEntries }), stdout: out.join("\n") }; };
});

describe("reference solutions run in Pyodide", () => {
  for (const id of ids) test(id, () => {
    const r = run(fs.readFileSync(new URL(`${id}.py`, DIR), "utf8"));
    assert.equal(r.ok, true, `${r.kind} on line ${r.line}: ${r.text || r.msg}`);
    assert.notEqual(r.stdout, "", "printed nothing");
  });
});

describe("errors point at the editor line", () => {
  const cases = [
    ["x = 5\nif x > 3\n    print('big')", "SyntaxError", 2, /expected ':'/],
    ["print('hello)", "SyntaxError", 1, /unterminated string literal/],
    ["if True:\nprint('hi')", "IndentationError", 2, /expected an indented block/],
    ["score = 10\nprint(scre)", "NameError", 2, /Did you mean: 'score'/],
    ["age = 10\nprint('I am ' + age)", "TypeError", 2, /can only concatenate str/],
    ["a = 1\nb = 0\nprint(a / b)", "ZeroDivisionError", 3, /division by zero/],
    ["items = ['a']\nprint(items[1])", "IndexError", 2, /out of range/],
    ["d = {'hp': 3}\nprint(d['xp'])", "KeyError", 2, /'xp'/],
    ["def f():\n    return 1 / 0\n\nf()", "ZeroDivisionError", 2, /division by zero/],
  ];
  for (const [src, kind, line, re] of cases) test(`${kind} line ${line}`, () => {
    const r = run(src);
    assert.equal(r.kind, kind); assert.equal(r.line, line); assert.match(r.text || r.msg, re);
  });
});
