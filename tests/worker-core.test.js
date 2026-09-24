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
  const asked = msgs.findIndex(m => m.type === "input");
  assert.ok(asked >= 0, "an input request was posted");
  // The prompt must reach the page before the input box opens.
  assert.equal(stdout(msgs.slice(0, asked)), "Name? ");
  assert.equal(stdout(msgs), "Name? Hi Alex\n");
});

test("a runaway print loop is capped and stopped", () => {
  const msgs = t.run('while True:\n    print("spam")');
  const r = result(msgs);
  assert.equal(r.ok, false); assert.equal(r.kind, "Stopped"); assert.equal(r.capped, true);
  assert.equal(stdout(msgs).length, 100_000, "output past the cap is dropped");
});

test("Stop from another thread interrupts a silent infinite loop", async () => {
  // Pyodide reads then zeroes the buffer non-atomically, so about 1 Stop in 30 from another
  // thread is lost. Keep pressing Stop until the run ends, or the loop can spin forever.
  const stopper = new Worker(`const { workerData } = require("node:worker_threads");
    setTimeout(() => setInterval(() => { Atomics.store(new Int32Array(workerData), 0, 2); }, 50), 200);`,
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

test("a long line of output cut off by the cap reports Stopped, not an internal error", () => {
  // Output with no newlines waits in Python's buffer and reaches the cap in big chunks.
  const r = result(t.run('for i in range(30000):\n    print(i, end=" ")'));
  assert.equal(r.kind, "Stopped"); assert.equal(r.capped, true);
});

test("the cap still reports Stopped when it trips in the harness's final flush", () => {
  // One write that crosses the cap, sent only when the harness flushes after the kid's code has
  // finished, so the interrupt lands in harness code, outside the kid's try.
  const msgs = t.run('print("x" * 100_001, end="")');
  const r = result(msgs);
  assert.equal(r.kind, "Stopped");
  assert.equal(r.capped, true, "capped as soon as any output is dropped");
  assert.equal(stdout(msgs).length, 100_000);
  assert.equal(stdout(t.run('print("fine")')), "fine\n");
});

test("a crash still reports its error when the cap trips in the harness's final flush", () => {
  const msgs = t.run('print("x" * 100_001, end="")\nprint(1 / 0)');
  const r = result(msgs);
  assert.equal(r.kind, "ZeroDivisionError"); assert.equal(r.line, 2); assert.equal(r.capped, true);
  assert.equal(stdout(msgs).length, 100_000);
});

test("a countdown printed on one line shows each number before its nap", () => {
  const shown = [];
  t.setSleep(() => { const now = stdout(t.messages); if (shown.at(-1) !== now) shown.push(now); });
  try { t.run('import time\nfor i in range(3, 0, -1):\n    print(i, end="... ")\n    time.sleep(0.05)\nprint("Go!")'); }
  finally { t.setSleep(null); }
  assert.deepEqual(shown, ["3... ", "3... 2... ", "3... 2... 1... "]);
});

test("output printed just before time.sleep reaches the page before the nap", () => {
  let shownAtNap = null;
  t.setSleep(() => { shownAtNap ??= stdout(t.messages); });
  try { t.run('import time\nprint("Ready")\nprint("Set")\ntime.sleep(0.1)\nprint("Go!")'); }
  finally { t.setSleep(null); }
  assert.equal(shownAtNap, "Ready\nSet\n");
});

test("kid code can't swap out the harness entry point for later runs", () => {
  t.run('import __main__\n__main__.run_visible = lambda src: {"ok": True, "hacked": True}');
  const msgs = t.run('print("fine")');
  assert.equal(result(msgs).hacked, undefined);
  assert.equal(stdout(msgs), "fine\n");
});

// A stand-in grading.py that reads input and tries to overwrite the message envelope.
const SNEAKY_GRADING = `import json
def grade_json(code, rule, starter, inputs, attempt):
    try:
        got = input()
    except EOFError:
        got = "EOF"
    return json.dumps({"passed": False, "feedback": got, "type": "stdout", "id": "someone-else"})
`;

test("a silent grading run never asks the page for input; it gets end-of-file", async () => {
  const g = await makeCore({ grading: SNEAKY_GRADING });
  g.core.grade({ id: "g1", code: "", rule: "{}", inputs: "[]" });
  assert.deepEqual(g.messages.map(m => m.type), ["graded"]);
  assert.equal(g.messages[0].feedback, "EOF");
  assert.equal(g.messages[0].id, "g1", "the envelope wins over fields from Python");
  // A visible run afterwards still asks for input as usual.
  g.setAnswers(["Alex"]);
  assert.equal(stdout(g.run('print("Hi", input())')), "Hi Alex\n");
});

// A stand-in grading.py that shows what it was sent.
const ECHO_GRADING = `import json
def grade_json(code, rule, starter, inputs, attempt):
    return json.dumps({"passed": False, "feedback": rule + " " + inputs})
`;

// The page (runner.js) sends the rule and inputs as JSON text, and the worker passes that text on as it is.
// Turning objects into JSON inside the worker would let kid code change them, with an inherited toJSON.
test("kid code that patches the page's JSON, Object.fromEntries or toJSON through import js can't change results", async () => {
  const g = await makeCore({ grading: ECHO_GRADING });
  const saved = [JSON.parse, JSON.stringify, Object.fromEntries];
  try {   // this test's process is the page here, so put its JavaScript back afterwards
    g.run(`import js
fake = js.Function.new("return { ok: true, passed: true, hacked: true }")
js.JSON.parse = fake
js.Object.fromEntries = fake
js.JSON.stringify = js.Function.new("return '\\"hacked\\"'")
js.Object.prototype.toJSON = js.Function.new("return 'hacked'")`);
    const r = result(g.run("print(1 / 0)"));
    assert.equal(r.hacked, undefined); assert.equal(r.kind, "ZeroDivisionError");
    g.messages.length = 0;
    g.core.grade({ id: "g1", code: "", rule: '{"output":"x"}', inputs: '["Sam"]' });
    assert.deepEqual(g.messages, [{ passed: false, feedback: '{"output":"x"} ["Sam"]', type: "graded", id: "g1" }]);
  } finally {
    [JSON.parse, JSON.stringify, Object.fromEntries] = saved;
    delete Object.prototype.toJSON;
  }
});
