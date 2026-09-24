// The game's door to Python. One worker is shared by every room; it starts loading on warmUp().
import { INPUT_BUFFER_BYTES, sendAnswer, cancelInput, resetInput } from "./input-channel.js";

export const RUN_TIME_LIMIT_MS = 10_000;
export const GRADE_TIME_LIMIT_MS = 8_000;   // a whole grading pass; each hidden run also has its own limit
const STOP_GRACE_MS = 1_000;               // if an interrupt is swallowed, restart the worker

let worker = null, ready = null, status = "idle", interrupt = null, inputBox = null, active = null, nextId = 1;
let queue = Promise.resolve(), newest = null;   // see takeTurn()
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

// One call at a time. A new call first stops the newest one, running or still waiting, because its
// room may have been left (say, at an input() prompt). It then waits until the worker is free, so the
// old call's timers can't interrupt or restart the worker under it. Returns the release function.
async function takeTurn(call) {
  newest?.stop("stop");
  newest = call;
  const turn = queue;
  let free;
  queue = new Promise(resolve => { free = resolve; });
  await turn;
  return () => { if (newest === call) newest = null; free(); };
}

// Runs code for the kid to see. The time limit pauses while input() waits for the kid.
// Resolves to { ok, kind, msg, line, text, capped, stdout, inputs, stopped, timedOut }.
export async function runCode(code, { onOutput = () => {}, onInputRequest = () => {} } = {}) {
  const id = newId(), inputs = [];
  let stdout = "", stopReason = null, interruptRun = () => {};
  const stop = reason => { if (!stopReason) { stopReason = reason; interruptRun(); } };
  // Once stopped, a run counts as Stopped even if it finished anyway, so its room won't go on to grade it.
  const settle = res => ({ ...res, ...(stopReason ? { ok: false, kind: "Stopped" } : {}), stdout, inputs,
    stopped: stopReason === "stop", timedOut: stopReason === "timeout" });
  const release = await takeTurn({ stop });
  try {
    await warmUp();
    if (stopReason) return settle({});   // stopped while it waited for its turn or for Python to load
    return await new Promise(resolve => {
      let limit = null, grace = null;
      const startClock = () => { clearTimeout(limit); limit = setTimeout(() => stop("timeout"), RUN_TIME_LIMIT_MS); };
      function finish(res) { clearTimeout(limit); clearTimeout(grace); active = null; resolve(settle(res)); }
      interruptRun = () => {
        Atomics.store(interrupt, 0, 2);
        cancelInput(inputBox);
        grace = setTimeout(() => { restart(); finish({ restarted: true }); }, STOP_GRACE_MS);
      };
      active = {
        id,
        answer(text) { inputs.push(text); stdout += text + "\n"; onOutput(text + "\n", "input"); sendAnswer(inputBox, text); startClock(); },
        onMessage(m) {
          if (m.id !== id) return;
          if (m.type === "stdout") { stdout += m.text; onOutput(m.text, "stdout"); }
          else if (m.type === "input") { clearTimeout(limit); onInputRequest(); }   // the kid's thinking time doesn't count
          else if (m.type === "result") finish(m);
        },
      };
      startClock();
      resetInput(inputBox);   // drop a Stop or answer left from the last run; the worker is idle now
      worker.postMessage({ type: "run", id, code });
    });
  } finally { release(); }
}
export const stopCode = () => newest?.stop("stop");
export const answerInput = text => active?.answer?.(text);

// Hidden grading pass. Resolves to { passed, feedback, failures, timedOut?, stopped? }.
export async function gradeCode(code, { rule, starter = "", inputs = [], attempt = 1 }) {
  const id = newId();
  let stopReason = null, interruptGrade = () => {};
  const stop = reason => { if (!stopReason) { stopReason = reason; interruptGrade(); } };
  // Once stopped, a pass says so: grading treats the interrupt as the kid's error, so its own feedback would mislead.
  const stopped = () => stopReason === "timeout"
    ? { passed: false, timedOut: true, feedback: "Checking your program took too long. Look for a loop that never stops." }
    : { passed: false, stopped: true, feedback: "Checking stopped before it finished. Press Run to try again." };
  const release = await takeTurn({ stop });
  try {
    await warmUp();
    if (stopReason) return stopped();
    return await new Promise(resolve => {
      let grace = null;
      const limit = setTimeout(() => stop("timeout"), GRADE_TIME_LIMIT_MS);
      function finish(res) { clearTimeout(limit); clearTimeout(grace); active = null; resolve(res); }
      interruptGrade = () => {
        Atomics.store(interrupt, 0, 2);
        grace = setTimeout(() => { restart(); finish(stopped()); }, STOP_GRACE_MS);
      };
      active = { id, onMessage(m) { if (m.id === id && m.type === "graded") finish(stopReason ? stopped() : m); } };
      worker.postMessage({ type: "grade", id, code, rule, starter, inputs, attempt });
    });
  } finally { release(); }
}
