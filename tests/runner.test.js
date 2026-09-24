import { test } from "node:test";
import assert from "node:assert/strict";
import { pythonSupported, pythonStatus, onPythonStatus, warmUp } from "../src/python/runner.js";

test("Python needs cross-origin isolation, module workers and WebAssembly", () => {
  // Node has no Worker global or crossOriginIsolated, so this must say unsupported.
  assert.equal(pythonSupported(), false);
});

test("status starts idle", () => {
  assert.equal(pythonStatus(), "idle");
});

// Last: it leaves the status at "unavailable".
test("a browser that can't start a module worker falls back instead of crashing", async () => {
  // Firefox before 114 is cross-origin isolated but throws from new Worker(url, { type: "module" }).
  globalThis.crossOriginIsolated = true;
  globalThis.Worker = class { constructor() { throw new TypeError("Module scripts are not supported on DedicatedWorker yet"); } };
  const seen = [], off = onPythonStatus(s => seen.push(s));
  try {
    assert.equal(pythonSupported(), true);
    await assert.rejects(warmUp(), TypeError);
    assert.equal(pythonStatus(), "unavailable");
    assert.deepEqual(seen, ["unavailable"]);
  } finally {
    off();
    delete globalThis.crossOriginIsolated;
    delete globalThis.Worker;
  }
});
