import { test } from "node:test";
import assert from "node:assert/strict";
import { Worker } from "node:worker_threads";
import { INPUT_BUFFER_BYTES, sendAnswer, cancelInput } from "../src/python/input-channel.js";

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
