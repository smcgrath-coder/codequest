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
});
