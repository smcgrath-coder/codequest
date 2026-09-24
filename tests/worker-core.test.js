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
