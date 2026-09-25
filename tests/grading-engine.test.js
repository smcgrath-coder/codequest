// tests/grading-engine.test.js
import { test, before, describe } from "node:test";
import assert from "node:assert/strict";
import { makeCore } from "./helpers/python.js";

let t;
before(async () => { t = await makeCore(); });
// The page sends the rule and inputs as JSON text (see runner.js's gradeCode), so do the same here.
const gradeWith = (c, code, rule, { starter = "", inputs = [], attempt = 1 } = {}) => {
  c.messages.length = 0;
  c.core.grade({ id: "g1", code, rule: JSON.stringify(rule), starter, inputs: JSON.stringify(inputs), attempt });
  return c.messages.find(m => m.type === "graded");
};
const grade = (...args) => gradeWith(t, ...args);
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
  test("a line that differs only in its spaces says to check the spaces", () => {
    const rule = { output: [{ expr: "lines(['Roses are red', '  Violets are blue'])" }] };
    assert.equal(grade('print("Roses are red")\nprint("Violets are blue")', rule).feedback,
      "Line 2 of your output says `Violets are blue` — so close! Check the spaces.");
    assert.equal(grade('print("Hello,World!")', HELLO).feedback, "Line 1 of your output says `Hello,World!` — so close! Check the spaces.");
    assert.equal(grade('print("***")', { output: [{ expr: "lines(['* * *'])" }] }).feedback,
      "Line 1 of your output says `***` — so close! Check the spaces.");
  });
  test("capitals or punctuation that differ as well as the spaces keep the capitals and punctuation message", () =>
    assert.equal(grade('print("hello,  world")', HELLO).feedback,
      "Line 1 of your output says `hello,  world` — so close! Check your capital letters and punctuation."));
  // Leaving out the punctuation leaves nothing to compare, so ### and #### would count as close.
  test("a line made only of punctuation or symbols isn't a near miss", () => {
    for (const [got, want] of [["###", "####"], ["==>", "=>"], ["★★★!", "★★★"]]) {
      assert.equal(grade(`print("${got}")`, { output: [{ expr: `lines(['${want}'])` }] }).feedback,
        `Line 1 of your output says \`${got}\`. Compare it with what the task asks for.`);
    }
  });
  test("polarity() reads a curly apostrophe like a straight one", () => {
    const rule = { output: [{ expr: "polarity(L[0]) == -1 and polarity(L[1]) == 1" }] };
    assert.equal(grade('print("2023 isn’t a leap year")\nprint("2024 is a leap year")', rule).passed, true);
  });
});

describe("concepts and probes", () => {
  const RULE = {
    output: [{ expr: "lines(['42'])" }],
    probes: [{ expr: "rerun({'a': '1', 'b': '2'})[0] == ['3']", hint: "Work it out from a and b: print(a + b)." }],
    concepts: [{ expr: "binop('Add') >= 1", hint: "Use + to add them." }],
  };
  test("a real calculation passes", () => assert.equal(grade("a = 15\nb = 27\nprint(a + b)", RULE).passed, true));
  // Typed with a + so the concept check passes and only the probe can catch it.
  test("typing the answer fails the probe with its hint", () => {
    const g = grade("a = 15\nb = 27\nprint(40 + 2)", RULE);
    assert.equal(g.passed, false); assert.match(g.feedback, /Work it out from a and b/);
  });
  test("the first attempt shows one hint, concepts before probes", () =>
    assert.equal(grade("a = 15\nb = 27\nprint(42)", RULE).feedback, "Use + to add them."));
  test("later attempts show up to two hints", () => {
    const g = grade("print(42)", RULE, { attempt: 3 });
    assert.match(g.feedback, /Use \+/); assert.match(g.feedback, /Work it out/);
  });
  test("rerun() replaces names set by unpacking, as in a, b = 15, 27", () => {
    assert.equal(grade("a, b = 15, 27\nprint(a + b)", RULE).passed, true);
    assert.match(grade("a, b = 15, 27\nprint(40 + 2)", RULE).feedback, /Work it out from a and b/);
    assert.equal(grade("[a, (b, c)] = [15, (27, 0)]\nprint(a + b)", RULE).passed, true);
  });
  // Nothing to swap in a, b = pair, so the new values are set just after it.
  test("rerun() replaces names unpacked from a value that isn't written out", () => {
    assert.equal(grade("pair = [15, 27]\na, b = pair\nprint(a + b)", RULE).passed, true);
    assert.equal(grade("first, *rest = [15, 27]\na, b = first, rest[0]\nprint(a + b)", RULE).passed, true);
  });
  test("by default rerun() still replaces a name's first plain assignment, even after an unpacking", () => {
    const rule = { output: [{ expr: "True" }], probes: [{ expr: "rerun({'x': '7'})[0] == ['14']", hint: "x" }] };
    assert.equal(grade("x, y = 0, 0\nx = 5\nprint(x * 2)", rule).passed, true);
  });
  test("rerun(all=True) replaces every top-level assignment of a name, and by default only the first", () => {
    const rule = { output: [{ expr: "True" }], probes: [
      { expr: "rerun({'scores': '[1, 1]'}, all=True)[0] == ['2']", hint: "every one" },
      { expr: "rerun({'scores': '[1, 1]'})[0] == ['110']", hint: "only the first" },
      { expr: "rerun({'scores#2': '[1, 1]'}, all=True)[0] == ['2']", hint: "a #n key still picks just that one" },
      { expr: "rerun({'scores#1': '[1, 1]'}, all=True)[0] == ['110']", hint: "a #n key still picks just that one" },
    ] };
    const g = grade("scores = [1, 2]\nscores = [50, 60]\nprint(sum(scores))", rule);
    assert.equal(g.passed, true, g.feedback);
    const unpacked = { output: [{ expr: "True" }], probes: [
      { expr: "rerun({'a': '1', 'b': '2'}, all=True)[0] == ['3']", hint: "every one" },
      { expr: "rerun({'a': '1', 'b': '2'})[0] == ['42']", hint: "only the first" },
    ] };
    const u = grade("a, b = 5, 6\na, b = 15, 27\nprint(a + b)", unpacked);
    assert.equal(u.passed, true, u.feedback);
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
  // A time limit raised as a function starts lands inside the kid's try, so the kid can catch it.
  test("a caught time limit still counts, even when the loop calls a function", () => {
    const code = "def step():\n    pass\ntry:\n    while True:\n        step()\nexcept:\n    pass\nprint('escaped')";
    const g = grade(code, { output: [{ expr: "lines(['escaped'])" }] });
    assert.equal(g.passed, false); assert.match(g.feedback, /never finished/);
  });
  test("a hidden re-run that catches the time limit fails its check, even with the right output", () => {
    const code = "n = 6\ndef step():\n    global n\n    n -= 2\ntry:\n    while n != 0:\n        step()\nexcept:\n    pass\nprint('done')";
    const g = grade(code, { output: [{ expr: "True" }], probes: [{ expr: "rerun({'n': '3'})[0] == ['done']", hint: "Make sure your loop always stops." }] });
    assert.equal(g.passed, false); assert.match(g.feedback, /never finished/);
  });
  test("a kid function called by a probe can't break the checks after it", () => {
    const code = "def f():\n    import builtins, sys\n    builtins.len = lambda x: 99\n    sys.setrecursionlimit(30)\n    return 1\nprint('hi')";
    const g = grade(code, { output: [{ expr: "True" }], probes: [
      { expr: "call('f()')[0] == 1", hint: "Call f." },
      { expr: "len([1, 2]) == 2 and (lambda g: g(g, 200))(lambda g, n: n and g(g, n - 1)) == 0", hint: "Grading was broken." },
    ] });
    assert.equal(g.passed, true, g.feedback);
  });
  test("exit() ends the program normally, as in a visible Run", () =>
    assert.equal(grade('print("Hello, World!")\nexit()\nprint("never")', HELLO).passed, true));
  test("recorded input is replayed", () => {
    const g = grade('name = input("Name? ")\nprint("Hi", name)', { output: [{ expr: "L == ['Name? Alex', 'Hi Alex']" }] }, { inputs: ["Alex"] });
    assert.equal(g.passed, true, g.feedback);
  });
  test("hidden re-runs get the same input as the first run", () => {
    const code = "name = input('Name? ')\na = 15\nb = 27\nprint(name, 'says', a + b)";
    const rule = { output: [{ expr: "nums([42])" }], probes: [{ expr: "rerun({'a': '1', 'b': '2'})[0] == ['Name? Sam', 'Sam says 3']", hint: "Work it out from a and b." }] };
    const g = grade(code, rule, { inputs: ["Sam"] });
    assert.equal(g.passed, true, g.feedback);
  });
  test("a re-run can be given its own input", () => {
    const rule = { output: [{ expr: "True" }], probes: [{ expr: "rerun(stdin_lines=['Bo'])[0] == ['Name? Bo', 'Hi Bo']", hint: "x" }] };
    const g = grade('name = input("Name? ")\nprint("Hi", name)', rule, { inputs: ["Alex"] });
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
  test("kid functions that probes call get the first run's input, then EOFError, and never ask the page", () => {
    const code = "def ask():\n    return input('Name? ')\nprint('hi')";
    const rule = { output: [{ expr: "True" }], probes: [
      { expr: "call('ask()') == ('Sam', ['Name? Sam'])", hint: "call" },
      { expr: "call('ask()') == ('Sam', ['Name? Sam'])", hint: "each call gets the answers from the start" },
      { expr: "val('ask()') == 'Sam'", hint: "val" },
      { expr: "callf('ask') == ('Sam', ['Name? Sam'])", hint: "callf" },
      { expr: "callt('ask()')[:2] == ('Sam', ['Name? Sam'])", hint: "callt" },
      { expr: "call('[ask(), ask()]') == (('__error__', 'EOFError: EOF when reading a line'), ['Name? Sam', 'Name?'])", hint: "out of answers" },
    ] };
    const g = grade(code, rule, { inputs: ["Sam"] });
    assert.equal(g.passed, true, g.feedback);
    assert.equal(t.messages.some(m => m.type === "input"), false);
  });
  // Copying the program's variables for the checks, and describing its error, run kid code too.
  test("kid code that grading runs outside a call gets the same scripted input", () => {
    const copied = "class Box:\n    def __deepcopy__(self, memo):\n        return input()\nb = Box()\nprint('hi')";
    const g = grade(copied, { output: [{ expr: "ns['b'] == 'Sam'" }] }, { inputs: ["Sam"] });
    assert.equal(g.passed, true, g.feedback);
    const raised = "class Oops(Exception):\n    def __str__(self):\n        return input()\nraise Oops()";
    assert.match(grade(raised, HELLO, { inputs: ["Sam"] }).feedback, /\(Oops: Sam\)/);
    assert.equal(t.messages.some(m => m.type === "input"), false);
  });
});

// Kid code gets the same stdlib modules that grading uses once the program has run. A patch that stayed
// would fake this grade and every later one in the session, so each of these must fail when it's wrong.
describe("kid code can't change how programs are graded", () => {
  let k;
  before(async () => { k = await makeCore(); });
  const grade = (...args) => gradeWith(k, ...args);
  const FAKE = `lambda *a, **k: '{"passed": true, "feedback": "x", "failures": []}'`;
  test("patching grading's modules in a Run doesn't carry over to later grades", () => {
    k.run(`import json, re, ast, copy\njson.dumps = ${FAKE}\nre.findall = lambda *a, **k: ['42']\nast.walk = lambda t: [ast.For()]\ncopy.deepcopy = lambda d: {'score': 10}`);
    assert.equal(grade("print('nope')", HELLO).passed, false);
    assert.equal(grade("print(1)", { output: [{ expr: "nums([42])" }] }).passed, false);
    assert.equal(grade("print('hi')", { output: [{ expr: "True" }], concepts: [{ expr: "count(ast.For) >= 1" }] }).passed, false);
    assert.equal(grade("score = 1\nprint('hi')", { output: [{ expr: "ns['score'] == 10" }] }).passed, false);
    assert.equal(grade('print("Hello, World!")', HELLO).passed, true);
  });
  test("a program that patches json.dumps can't fake its own pass", () => {
    assert.equal(grade(`import json\njson.dumps = ${FAKE}\nprint('nope')`, HELLO).passed, false);
    assert.equal(grade("print('nope')", HELLO).passed, false);
  });
  // json.dumps and json.loads look up these class methods every time, and class attributes aren't put back.
  test("a program that patches json's encoder class can't fake its own pass", () =>
    assert.equal(grade(`import json\njson.JSONEncoder.encode = ${FAKE}\nprint('nope')`, HELLO).passed, false));
  test("patching json's classes in a Run doesn't carry over to later grades", () => {
    k.run(`import json\njson.JSONEncoder.encode = ${FAKE}\njson.JSONDecoder.decode = lambda self, s, *a, **k: {}`);
    assert.equal(grade("print('nope')", HELLO).passed, false);
    assert.equal(grade('print("hello, world")', HELLO).feedback, "Line 1 of your output says `hello, world` — so close! Check your capital letters and punctuation.");
    assert.equal(grade('print("Hello, World!")', HELLO).passed, true);
  });
  test("a kid function called by a probe can't patch the checks after it", () => {
    const code = "def f():\n    import re\n    re.findall = lambda *a, **k: ['42']\n    return 1\nprint('nope')";
    const g = grade(code, { output: [{ expr: "True" }], probes: [{ expr: "call('f()')[0] == 1" }, { expr: "nums([42])", hint: "Print 42." }] });
    assert.equal(g.feedback, "Print 42.");
  });
  test("replacing sys.setprofile in a Run doesn't hide the functions later programs call", () => {
    k.run("import sys\nsys.setprofile = lambda f: None");
    const g = grade("def greet():\n    print('hi')\ngreet()", { output: [{ expr: "True" }], probes: [{ expr: "called('greet')", hint: "Call greet." }] });
    assert.equal(g.passed, true, g.feedback);
  });
  test("a program can't replace what grading reads back from its output", () =>
    assert.equal(grade("import sys\nsys.stdout.getvalue = lambda: 'Hello, World!'\nprint('nope')", HELLO).passed, false));
  test("a kid function that a probe calls, or a re-run, can't plant a regex for the checks after it", () => {
    const plant = String.raw`def f():
    import re
    class P:
        def findall(self, *a):
            return ['42']
    re._cache2[(str, r"-?\d+(?:\.\d+)?", 0)] = P()
    return 1
`;
    const later = { expr: "nums([42])", hint: "Print 42." };
    assert.equal(grade(plant + "print('nope')", { output: [{ expr: "True" }], probes: [{ expr: "call('f()')[0] == 1" }, later] }).feedback, "Print 42.");
    assert.equal(grade(plant + "go = False\nif go:\n    f()\nprint('nope')", { output: [{ expr: "True" }], probes: [{ expr: "rerun({'go': 'True'}) and True" }, later] }).feedback, "Print 42.");
  });
  // Putting a module's names back puts back the same dicts and classes, with whatever kid code put in them.
  // [what the program does, the patch, a rule, a wrong program the patch would pass, a right one]
  const SCORE = { output: [{ expr: String.raw`lines([r're:Score: \d+'])` }] };
  const ROUTES = [
    ["plants a regex in re's cache", String.raw`import re
class P:
    def fullmatch(self, *a):
        return True
re._cache2[(str, r'Score: \d+', 0)] = P()
`, SCORE, "print('Score: lots')", "print('Score: 12')"],
    ["plants the regex nums() uses in re's cache", String.raw`import re
class P:
    def findall(self, *a):
        return ['42']
re._cache2[(str, r"-?\d+(?:\.\d+)?", 0)] = P()
`, { output: [{ expr: "nums([42])" }] }, "print('nope')", "print(42)"],
    ["changes what \\d means to re", String.raw`import re
re._parser.CATEGORIES[r'\d'] = re._parser.CATEGORIES[r'\w']
re.purge()
`, SCORE, "print('Score: lots')", "print('Score: 12')"],
    ["replaces re's compiler", String.raw`import re, re._compiler as c
real = c.compile
c.compile = lambda p, f=0: real('(?s).*', f)
re.purge()
`, SCORE, "print('Score: lots')", "print('Score: 12')"],
    ["changes how copy copies a dict", `import copy\ncopy._deepcopy_dispatch[dict] = lambda x, memo: {'score': 10}\n`,
      { output: [{ expr: "ns['score'] == 10" }] }, "score = 1\nprint('hi')", "score = 10\nprint('hi')"],
    ["changes how copy copies a set", `import copyreg\ncopyreg.dispatch_table[set] = lambda s: (set, ([1, 2, 3],))\n`,
      { output: [{ expr: "ns['seen'] == {1, 2, 3}" }] }, "seen = {1}\nprint('hi')", "seen = {3, 2, 1}\nprint('hi')"],
    ["makes redirect_stdout print the answer", `import contextlib
def enter(self):
    self._new_target.write('Hello, World!\\n')
    return self._new_target
contextlib._RedirectStream.__enter__ = enter
contextlib._RedirectStream.__exit__ = lambda self, *a: None
`, HELLO, "print('nope')", 'print("Hello, World!")'],
  ];
  for (const [how, patch, rule, wrong, right] of ROUTES) {
    test(`a program that ${how} can't fake a pass, in the same program or carried over from a Run`, () => {
      assert.equal(grade(patch + wrong, rule).passed, false, "same program");
      k.run(patch);
      assert.equal(k.messages.find(m => m.type === "result").ok, true, "the patch itself runs");
      assert.equal(grade(wrong, rule).passed, false, "carried over");
      const g = grade(right, rule);
      assert.equal(g.passed, true, g.feedback);
    });
  }
});
