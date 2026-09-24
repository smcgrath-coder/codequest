// One Python worker for the whole app. Loading starts on the first call to
// warmUp() and is shared by every Run.
const TIMEOUT_MS = 5000;
let worker = null, readyPromise = null, sab = null, nextId = 1;
const listeners = new Set();   // loading-status subscribers: "loading" | "ready" | "failed"
let status = "idle";
const setStatus = s => { status = s; listeners.forEach(f => f(s)); };

function spawn() {
  worker = new Worker(new URL("./py.worker.js", import.meta.url), { type: "module" });
  setStatus("loading");
  readyPromise = new Promise((resolve, reject) => {
    worker.onmessage = ({ data }) => {
      if (data.type === "ready") { setStatus("ready"); resolve(data.ms); }
      if (data.type === "fatal") { setStatus("failed"); reject(new Error(data.msg)); }
    };
    worker.onerror = e => { setStatus("failed"); reject(new Error(e.message || "worker failed to start")); };
  });
  if (self.crossOriginIsolated) {
    sab = new SharedArrayBuffer(1);
    worker.postMessage({ type: "interrupt", sab });
  } else sab = null;
  return readyPromise;
}

export const warmUp = () => readyPromise || spawn();
export const getStatus = () => status;
export const onStatus = f => { listeners.add(f); return () => listeners.delete(f); };
export const canInterrupt = () => !!sab;

// Resolves to { ok, kind, msg, line, col, text, stdout, truncated, ms }.
export async function runPython(code, { onStdout, timeoutMs = TIMEOUT_MS } = {}) {
  await warmUp();
  const id = nextId++;
  let stdout = "";
  return new Promise(resolve => {
    let killTimer = null;
    const timer = setTimeout(() => {
      if (sab) { Atomics.store(new Uint8Array(sab), 0, 2); killTimer = setTimeout(hardStop, 1000); } // SIGINT, then give up after 1 s
      else hardStop();
    }, timeoutMs);
    function hardStop() {
      worker.terminate(); readyPromise = null; worker = null;
      resolve({ ok: false, kind: "Timeout", stdout, restarted: true });
      warmUp();                       // respawn in the background (~1 s measured on an M4 Pro)
    }
    worker.onmessage = ({ data }) => {
      if (data.type === "stdout") { stdout += data.text; onStdout?.(data.text); }
      if (data.type === "result" && data.id === id) { clearTimeout(timer); clearTimeout(killTimer); resolve({ ...data, stdout }); }
    };
    worker.postMessage({ type: "run", id, code });
  });
}
