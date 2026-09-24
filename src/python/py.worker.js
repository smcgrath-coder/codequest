// One module worker for the whole app: loads Pyodide once, then runs and grades on request.
import { loadPyodide } from "pyodide";
import harness from "./harness.py?raw";
import grading from "./grading.py?raw";
import { createPythonCore } from "./worker-core.js";
import { waitForAnswer } from "./input-channel.js";
import { PYODIDE_PATH } from "./config.js";

const nap = new Int32Array(new SharedArrayBuffer(4));   // Atomics.wait target for time.sleep
// Taken now, before any kid code runs: kid code can reach self through `import js` and swap
// postMessage for its own, to read run ids or rewrite results. See worker-core.js.
const post = self.postMessage.bind(self);
let core;

self.onmessage = async ({ data }) => {
  if (data.type === "init") {
    try {
      core = await createPythonCore({
        loadPyodide,
        indexURL: new URL(PYODIDE_PATH.slice(1), new URL(import.meta.env.BASE_URL, self.location.origin)).href,
        sources: { harness, grading },
        post,
        readInput: () => waitForAnswer(data.input),
        sleepMs: ms => Atomics.wait(nap, 0, 0, ms),
        interruptBuffer: new Int32Array(data.interrupt),
      });
      post({ type: "ready" });
    } catch (e) {
      post({ type: "fatal", msg: String(e) });
    }
  } else if (data.type === "run") core.run(data);
  else if (data.type === "grade") core.grade(data);
};
