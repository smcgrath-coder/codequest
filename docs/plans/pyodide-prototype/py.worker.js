import { loadPyodide } from "pyodide";
import HARNESS from "./harness.py?raw";

const MAX_OUTPUT = 20000;   // characters kept per run; the rest is dropped
const FLUSH_MS = 50;        // stream stdout to the page at most every 50 ms

let py, runSubmission, interrupt = null;
let buf = "", total = 0, lastFlush = 0, truncated = false;
const dec = new TextDecoder();

function flush(force) {
  const now = performance.now();
  if (buf && (force || now - lastFlush > FLUSH_MS)) { postMessage({ type: "stdout", text: buf }); buf = ""; lastFlush = now; }
}
function write(bytes) {
  const s = dec.decode(bytes);
  if (total < MAX_OUTPUT) { const keep = s.slice(0, MAX_OUTPUT - total); buf += keep; total += keep.length; }
  else truncated = true;
  flush(false);
  return bytes.length;
}

const ready = (async () => {
  const t0 = performance.now();
  py = await loadPyodide({ indexURL: new URL(import.meta.env.BASE_URL + "pyodide/", self.location.origin).href });
  py.setStdout({ write });
  py.setStderr({ write });
  py.runPython(HARNESS);
  runSubmission = py.globals.get("run_submission");
  postMessage({ type: "ready", ms: performance.now() - t0 });
})().catch(e => postMessage({ type: "fatal", msg: String(e) }));

self.onmessage = async ({ data }) => {
  await ready;
  if (data.type === "interrupt") { interrupt = new Uint8Array(data.sab); py.setInterruptBuffer(interrupt); return; }
  if (data.type === "run") {
    if (interrupt) interrupt[0] = 0;
    buf = ""; total = 0; truncated = false;
    const t = performance.now();
    const res = runSubmission(data.code).toJs({ dict_converter: Object.fromEntries });
    flush(true);
    postMessage({ type: "result", id: data.id, ms: performance.now() - t, truncated, ...res });
  }
};
