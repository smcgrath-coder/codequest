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
