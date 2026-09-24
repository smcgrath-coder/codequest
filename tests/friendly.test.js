import { test, before } from "node:test";
import assert from "node:assert/strict";
import { makeCore } from "./helpers/python.js";
import { friendlyError } from "../src/python/friendly.js";

let t;
before(async () => { t = await makeCore(); });
// Real results from the Python core, so these track Python's real wording.
const explain = code => friendlyError(t.run(code).find(m => m.type === "result"), code);

const cases = [
  ["x = 5\nif x > 3\n    print('big')", 2, /needs a colon :/],
  ["print('hello)", 1, /never closes it/],
  ["print('hi'", 1, /opens a bracket \( that never gets closed\. Count your brackets: every \( needs a \)\./],
  ["x = [1, 2", 1, /opens a bracket \[ that never gets closed\. Count your brackets: every \[ needs a \]\./],
  ["d = {'hp': 3", 1, /opens a bracket \{ that never gets closed\. Count your brackets: every \{ needs a \}\./],
  ["if True:\nprint('hi')", 2, /pushed in with 4 spaces, because the line before it ends with a colon/],
  ["if True:\n\nprint('hi')", 3, /pushed in with 4 spaces, because line 1 ends with a colon/],
  // Untouched starter code that ends in a colon: Python points at the colon line itself.
  ["total = 0\nfor i in range(1, 101):", 2, /Line 2 ends with a colon, so it needs at least one line of code under it/],
  ["for i in range(3):\n    # your code here", 2, /Line 1 ends with a colon, so it needs at least one line of code under it/],
  ["  print('hi')", 1, /shouldn't be/],
  ["if True:\n        x = 1\n    y = 2", 3, /don't line up/],
  ['print "hello"', 1, /print needs round brackets/],
  ["x = 5\nif x = 5:\n    print(x)", 2, /use == \(two equals signs\)/],
  ["score = 10\nprint(scre)", 2, /Did you mean score\?/],
  ["print(Hello)", 1, /put them in quotes: print\("Hello"\)/],
  ["print(Any)", 1, /put them in quotes: print\("Any"\)/],   // not Python's "Did you mean: 'any'?"
  ["def f():\n    print(hp)\n    hp = 3\nf()", 2, /uses hp before it has been given a value/],
  ["age = 10\nprint('I am ' + age)", 2, /str\(\)/],
  ["print(10 / 0)", 1, /divides by zero/],
  ["items = ['a']\nprint(items[1])", 2, /start counting at 0/],
  ["d = {'hp': 3}\nprint(d['xp'])", 2, /doesn't have it/],
  ["n = int('abc')", 1, /int\(\) can only turn digits/],
  ["'hi'.uper()", 1, /there's no \.uper\(\)\. Did you mean \.upper\(\)\?/],
  ["import math\nprint(math.pii)", 2, /there's no \.pii\. Did you mean \.pi\?$/],   // not called, so no ()
  ["def f():\n    return f()\nf()", 2, /keeps calling itself/],
];
for (const [code, line, message] of cases) test(`explains ${JSON.stringify(code)}`, () => {
  const f = explain(code);
  assert.equal(f.line, line);
  assert.match(f.headline, message);
  assert.ok(f.python.length > 0, "keeps Python's own words for 'What Python said'");
});

test("a module used without importing it says to add the import, not to use quotes", () => {
  for (const [code, name] of [["print(random.randint(1, 6))", "random"], ["x = math.sqrt(4)", "math"]]) {
    const f = explain(code);
    assert.match(f.headline, new RegExp(`Add import ${name} at the top of your program\\.`));
    assert.doesNotMatch(f.headline, /quotes|Create it with =/);
  }
});

test("a word in print() that happens to be a module's name gets the quotes advice and the import", () => {
  const f = explain("print(abc)");   // Python: "Did you mean: 'abs'? Or did you forget to import 'abc'?"
  assert.match(f.headline, /put them in quotes: print\("abc"\)/);
  assert.match(f.headline, /If you meant the abc module, add import abc at the top of your program\./);
});

test("when Python guesses a spelling and a missing import, both are offered", () => {
  const f = explain("strings = ['a']\nprint(string)");
  assert.match(f.headline, /Did you mean strings\?/);
  assert.match(f.headline, /add import string at the top of your program\./);
});

test("adding a number and what input() gave back explains that input() gives text", () => {
  t.setAnswers(["5"]);
  const f = explain('total = 0\ntotal = total + input("n? ")');
  assert.equal(f.line, 2);
  assert.match(f.headline, /input\(\) always gives text/);
  assert.match(f.headline, /Turn it into a number with int\(input\(\.\.\.\)\) before/);
  assert.doesNotMatch(f.headline, /str\(\)/);
});

test("joining text and a number already made with int(input()) still gets the str() advice", () => {
  t.setAnswers(["5"]);
  const f = explain('print("Next year: " + int(input()) + 1)');
  assert.match(f.headline, /str\(\)/); assert.doesNotMatch(f.headline, /input\(\) always gives text/);
});

test("a kid's own exception whose name contains a Python error's name gets its own words", () => {
  const f = explain("class MyNameError(Exception):\n    pass\n\nraise MyNameError('oops')");
  assert.equal(f.headline, "Line 4: MyNameError: oops");
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
