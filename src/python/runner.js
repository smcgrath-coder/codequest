// The game's door to Python. One worker is shared by every room; it starts loading on warmUp().
import { INPUT_BUFFER_BYTES, sendAnswer, cancelInput, resetInput } from "./input-channel.js";

export const RUN_TIME_LIMIT_MS = 10_000;
export const GRADE_TIME_LIMIT_MS = 8_000;   // a whole grading pass; each hidden run also has its own limit
const STOP_GRACE_MS = 1_000;               // if an interrupt is swallowed, restart the worker

let worker = null, ready = null, status = "idle", interrupt = null, inputBox = null, active = null, nextId = 1;
const listeners = new Set();
const setStatus = s => { status = s; listeners.forEach(f => f(s)); };

export function pythonSupported() {
  return typeof Worker !== "undefined" && typeof WebAssembly === "object"
    && typeof SharedArrayBuffer !== "undefined" && globalThis.crossOriginIsolated === true;
}
export const pythonStatus = () => status;
export function onPythonStatus(f) { listeners.add(f); return () => listeners.delete(f); }

function spawn() {
  worker = new Worker(new URL("./py.worker.js", import.meta.url), { type: "module" });
  interrupt = new Int32Array(new SharedArrayBuffer(4));
  inputBox = new SharedArrayBuffer(INPUT_BUFFER_BYTES);
  setStatus("loading");
  ready = new Promise((resolve, reject) => {
    worker.onmessage = ({ data }) => {
      if (data.type === "ready") { setStatus("ready"); resolve(); }
      else if (data.type === "fatal") { setStatus("unavailable"); reject(new Error(data.msg)); }
      else active?.onMessage(data);
    };
    worker.onerror = e => { setStatus("unavailable"); reject(new Error(e.message || "Python worker failed to start")); };
  });
  ready.catch(() => {});
  worker.postMessage({ type: "init", interrupt: interrupt.buffer, input: inputBox });
  return ready;
}

function restart() {
  worker?.terminate();
  worker = null; ready = null; active = null;
  spawn();
}

// Starts loading Python in the background. Rejects if this device can't run it.
export function warmUp() {
  if (!pythonSupported()) { setStatus("unavailable"); return Promise.reject(new Error("unsupported")); }
  if (ready) return ready;
  // Browsers without module workers throw from new Worker(); reject instead, so callers fall back.
  try { return spawn(); }
  catch (e) { setStatus("unavailable"); return Promise.reject(e); }
}

const newId = () => `${nextId++}-${Math.random().toString(36).slice(2)}`;

// Runs code for the kid to see.
// Resolves to { ok, kind, msg, line, text, capped, stdout, inputs, stopped, timedOut }.
export async function runCode(code, { onOutput = () => {}, onInputRequest = () => {} } = {}) {
  await warmUp();
  const id = newId(), inputs = [];
  let stdout = "";
  return new Promise(resolve => {
    let stopReason = null, grace = null;
    const limit = setTimeout(() => stop("timeout"), RUN_TIME_LIMIT_MS);
    function finish(res) {
      clearTimeout(limit); clearTimeout(grace); active = null;
      resolve({ ...res, stdout, inputs, stopped: stopReason === "stop", timedOut: stopReason === "timeout" });
    }
    function stop(reason) {
      if (stopReason) return;
      stopReason = reason;
      Atomics.store(interrupt, 0, 2);
      cancelInput(inputBox);
      grace = setTimeout(() => { restart(); finish({ ok: false, kind: "Stopped", restarted: true }); }, STOP_GRACE_MS);
    }
    active = {
      id, stop,
      answer(text) { inputs.push(text); stdout += text + "\n"; onOutput(text + "\n", "input"); sendAnswer(inputBox, text); },
      onMessage(m) {
        if (m.id !== id) return;
        if (m.type === "stdout") { stdout += m.text; onOutput(m.text, "stdout"); }
        else if (m.type === "input") onInputRequest();
        else if (m.type === "result") finish(m);
      },
    };
    resetInput(inputBox);   // drop a Stop or answer left from the last run; the worker is idle now
    worker.postMessage({ type: "run", id, code });
  });
}
export const stopCode = () => active?.stop?.("stop");
export const answerInput = text => active?.answer?.(text);

// Hidden grading pass. Resolves to { passed, feedback, failures, timedOut? }.
export async function gradeCode(code, { rule, starter = "", inputs = [], attempt = 1 }) {
  await warmUp();
  const id = newId();
  return new Promise(resolve => {
    let grace = null;
    const limit = setTimeout(() => {
      Atomics.store(interrupt, 0, 2);
      grace = setTimeout(() => { restart(); resolve({ passed: false, timedOut: true,
        feedback: "Checking your program took too long. Look for a loop that never stops." }); }, STOP_GRACE_MS);
    }, GRADE_TIME_LIMIT_MS);
    active = { id, onMessage(m) {
      if (m.id === id && m.type === "graded") { clearTimeout(limit); clearTimeout(grace); active = null; resolve(m); }
    } };
    worker.postMessage({ type: "grade", id, code, rule, starter, inputs, attempt });
  });
}
