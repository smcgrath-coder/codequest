// A tiny shared-memory mailbox so Python's input() can wait for the kid to type.
// Int32 [0] = state (0 waiting, 1 answer ready, 2 cancelled), [1] = answer length in bytes.
const HEADER = 8, CAPACITY = 4096;
export const INPUT_BUFFER_BYTES = HEADER + CAPACITY;

// Worker side: blocks until the page answers. Returns the text, or null if the run was stopped.
export function waitForAnswer(sab) {
  const ctl = new Int32Array(sab, 0, 2);
  Atomics.wait(ctl, 0, 0);
  const state = Atomics.load(ctl, 0);
  // TextDecoder refuses views of shared memory, so copy the bytes out first.
  const text = state === 1 ? new TextDecoder().decode(new Uint8Array(sab, HEADER, ctl[1]).slice()) : null;
  Atomics.store(ctl, 0, 0);
  return text;
}

// Page side.
export function sendAnswer(sab, text) {
  const bytes = new TextEncoder().encode(text).slice(0, CAPACITY);
  new Uint8Array(sab, HEADER, CAPACITY).set(bytes);
  const ctl = new Int32Array(sab, 0, 2);
  ctl[1] = bytes.length;
  Atomics.store(ctl, 0, 1);
  Atomics.notify(ctl, 0);
}

export function cancelInput(sab) {
  const ctl = new Int32Array(sab, 0, 2);
  Atomics.store(ctl, 0, 2);
  Atomics.notify(ctl, 0);
}

// Call before each run, while the worker is idle. A Stop or answer sent when nobody
// was waiting stays in the mailbox, and would otherwise skip the next input().
export function resetInput(sab) {
  Atomics.store(new Int32Array(sab, 0, 2), 0, 0);
}
