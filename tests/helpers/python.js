// Builds the same Python core the browser worker uses, on real Pyodide from npm.
import fs from "node:fs";
import { loadPyodide } from "pyodide";
import { createPythonCore } from "../../src/python/worker-core.js";

const read = f => fs.readFileSync(new URL(`../../src/python/${f}`, import.meta.url), "utf8");
export const SOURCES = { harness: read("harness.py"), grading: read("grading.py") };

// `sources` swaps in test versions of harness.py or grading.py.
export async function makeCore(sources = {}) {
  const messages = [];
  let answers = [], nap = () => {};
  const interruptBuffer = new Int32Array(new SharedArrayBuffer(4));
  const core = await createPythonCore({
    loadPyodide, sources: { ...SOURCES, ...sources }, interruptBuffer,
    post: m => messages.push(m),
    readInput: () => (answers.length ? answers.shift() : null),
    sleepMs: ms => nap(ms),
  });
  return {
    core, messages, interruptBuffer,
    setAnswers: a => { answers = [...a]; },
    setSleep: f => { nap = f || (() => {}); },
    run(code) { messages.length = 0; core.run({ id: "t1", code }); return messages; },
  };
}
