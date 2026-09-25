// The game's door to Python. One worker is shared by every room; it starts loading on warmUp().
import { INPUT_BUFFER_BYTES, sendAnswer, cancelInput, resetInput } from "./input-channel.js";

export const RUN_TIME_LIMIT_MS = 10_000;
export const GRADE_TIME_LIMIT_MS = 8_000;   // a whole grading pass; each hidden run also has its own limit
export const LOAD_TIME_LIMIT_MS = 45_000;   // a first download on a slow school network; see untilReady()
const STOP_GRACE_MS = 1_000;               // if an interrupt is swallowed, restart the worker
// Taken at load, like worker-core.js's. Grading's rule and inputs are turned into JSON here, on the page,
// because in the worker kid code could plant an inherited toJSON (through `import js`) and change them.
const jsonStringify = JSON.stringify;

let worker = null, ready = null, loadLimit = null, status = "idle", interrupt = null, inputBox = null, active = null, nextId = 1;
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
  let booting = true, slow = null;
  // Rejects if this worker is still loading after LOAD_TIME_LIMIT_MS; never once it has booted. late: true
  // lets the room say Python is still loading, not that this device can't run it.
  loadLimit = new Promise((_, reject) => {
    slow = setTimeout(() => reject(Object.assign(new Error("Python is taking too long to load"), { late: true })), LOAD_TIME_LIMIT_MS);
  });
  loadLimit.catch(() => {});
  ready = new Promise((resolve, reject) => {
    // Only this worker's own boot report counts. Later, kid code (through `import js`) could post
    // "ready" or "fatal", or throw in the worker, and none of that must change the status.
    const booted = err => {
      if (!booting) return;
      booting = false;
      clearTimeout(slow);
      if (err) { setStatus("unavailable"); reject(err); } else { setStatus("ready"); resolve(); }
    };
    worker.onmessage = ({ data }) => {
      const type = data?.type;
      if (type === "ready") booted();
      else if (type === "fatal") booted(new Error(data.msg));
      else if (type) active?.onMessage(data);
    };
    worker.onerror = e => booted(new Error(e.message || "Python worker failed to start"));
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
// For a restart nobody waits on: if the new worker can't start, the next call tries again and rejects.
function restartQuietly() {
  try { restart(); } catch { setStatus("idle"); }
}

// Starts loading Python in the background. Rejects if this device can't run it.
export function warmUp() {
  if (!pythonSupported()) { setStatus("unavailable"); return Promise.reject(new Error("unsupported")); }
  if (ready) return ready;
  // Browsers without module workers throw from new Worker(); reject instead, so callers fall back.
  try { return spawn(); }
  catch (e) { setStatus("unavailable"); return Promise.reject(e); }
}

// A call's first step: waits for Python to load. setInterrupt gets a function that ends the wait at once, for
// a Stop. Rejects, so the room falls back to the keyword grader, when Python can't load or when it has been
// loading for LOAD_TIME_LIMIT_MS, as a stalled download would. That time counts from when loading started, so
// once Python is late every call falls back at once. Either way loading carries on, and calls use Python again
// as soon as it's ready: a slow load never marks it unavailable.
function untilReady(setInterrupt) {
  return new Promise((resolve, reject) => {
    setInterrupt(resolve);
    warmUp().then(resolve, reject);
    if (status === "loading") loadLimit.catch(reject);
  });
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
// Resolves to { ok, kind, msg, line, text, capped, stdout, inputs, stopped, timedOut }, plus
// restarted: true when a stuck worker had to be replaced. internal: true (with kind "Internal") means the
// harness itself broke, and the worker is replaced then too. Rejects when this device can't run Python, or
// Python fails to load or is late (see untilReady()), so the caller can fall back to the keyword grader.
export async function runCode(code, { onOutput = () => {}, onInputRequest = () => {} } = {}) {
  const id = newId(), inputs = [];
  let stdout = "", stopReason = null, interruptRun = () => {};
  const stop = reason => { if (!stopReason) { stopReason = reason; interruptRun(); } };
  // Once stopped, a run counts as Stopped even if it finished anyway, so its room won't go on to grade it.
  const settle = res => ({ ...res, ...(stopReason ? { ok: false, kind: "Stopped" } : {}), stdout, inputs,
    stopped: stopReason === "stop", timedOut: stopReason === "timeout" });
  const release = await takeTurn({ stop });
  try {
    if (!stopReason) await untilReady(end => { interruptRun = end; });   // a Stop while Python loads ends the wait
    if (stopReason) return settle({});   // stopped while it waited for its turn or for Python to load
    return await new Promise(resolve => {
      let limit = null, grace = null;
      const startClock = () => { clearTimeout(limit); limit = setTimeout(() => stop("timeout"), RUN_TIME_LIMIT_MS); };
      function finish(res) { clearTimeout(limit); clearTimeout(grace); active = null; resolve(settle(res)); }
      interruptRun = () => {
        Atomics.store(interrupt, 0, 2);
        cancelInput(inputBox);
        grace = setTimeout(() => { try { restart(); } finally { finish({ restarted: true }); } }, STOP_GRACE_MS);
      };
      let asking = false;   // an input() is waiting for this run's answer
      active = {
        id,
        answer(text) {
          if (!asking || stopReason) return;   // a second Enter, or one after Stop, would answer the next input()
          asking = false;
          inputs.push(text); stdout += text + "\n"; onOutput(text + "\n", "input"); sendAnswer(inputBox, text); startClock();
        },
        onMessage(m) {
          if (m.id !== id) return;
          if (m.type === "stdout") { stdout += m.text; onOutput(m.text, "stdout"); }
          else if (m.type === "input") { asking = true; clearTimeout(limit); onInputRequest(); }   // the kid's thinking time doesn't count
          else if (m.type === "result") {
            if (m.internal) restartQuietly();   // Python itself broke: see gradeCode's m.internal
            finish(m);
          }
        },
      };
      resetInput(inputBox);   // drop a Stop or answer left from the last run; the worker is idle now
      worker.postMessage({ type: "run", id, code });
      startClock();           // only once sent: if postMessage throws, no timer is left to stop a later call
    });
  } finally { release(); }
}
export const stopCode = () => newest?.stop("stop");
// Replaces the worker with a fresh one, for after kid code that may have changed what grading uses or taken
// over the worker's message handler (see flow.js's reachesIntoPython). It waits its turn without stopping
// the call in progress, and the next call waits for the new worker to load.
export async function restartPython() {
  const turn = queue;
  let free;
  queue = new Promise(resolve => { free = resolve; });
  await turn;
  try { if (worker) restartQuietly(); } finally { free(); }
}
// Answers the input() the running program is waiting at. Does nothing if none is waiting.
export const answerInput = text => active?.answer?.(text);

// Hidden grading pass. Resolves to { passed, feedback, failures, timedOut?, stopped? }.
// Rejects like runCode when this device can't run Python, or Python fails to load or is late.
export async function gradeCode(code, { rule, starter = "", inputs = [], attempt = 1 }) {
  const id = newId(), ruleJson = jsonStringify(rule), inputsJson = jsonStringify(inputs || []);
  let stopReason = null, interruptGrade = () => {};
  const stop = reason => { if (!stopReason) { stopReason = reason; interruptGrade(); } };
  // Once stopped, a pass says so: grading treats the interrupt as the kid's error, so its own feedback would mislead.
  const stopped = () => stopReason === "timeout"
    ? { passed: false, timedOut: true, feedback: "Checking your program took too long. Look for a loop that never stops." }
    : { passed: false, stopped: true, feedback: "Checking stopped before it finished. Press Run to try again." };
  const release = await takeTurn({ stop });
  try {
    if (!stopReason) await untilReady(end => { interruptGrade = end; });
    if (stopReason) return stopped();
    return await new Promise(resolve => {
      let limit = null, grace = null;
      function finish(res) { clearTimeout(limit); clearTimeout(grace); active = null; resolve(res); }
      interruptGrade = () => {
        Atomics.store(interrupt, 0, 2);
        grace = setTimeout(() => { try { restart(); } finally { finish(stopped()); } }, STOP_GRACE_MS);
      };
      active = {
        id,
        onMessage(m) {
          if (m.id !== id || m.type !== "graded") return;
          // Grading broke in its own code, so Python may be left half put back (builtins, __main__,
          // stdlib modules). Start a fresh worker now, so the next call waits for it instead.
          if (m.internal) restartQuietly();
          finish(stopReason ? stopped() : m);
        },
      };
      worker.postMessage({ type: "grade", id, code, rule: ruleJson, starter, inputs: inputsJson, attempt });
      limit = setTimeout(() => stop("timeout"), GRADE_TIME_LIMIT_MS);   // only once sent, as in runCode
    });
  } finally { release(); }
}
