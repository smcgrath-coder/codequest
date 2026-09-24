// The Python side of the runner: shared by the browser worker (py.worker.js) and the tests.
const MAX_OUTPUT_CHARS = 100_000;   // about 2,000 lines of typical output
const FLUSH_MS = 50;

export async function createPythonCore({ loadPyodide, indexURL, sources, post, readInput, sleepMs, interruptBuffer }) {
  const py = await loadPyodide(indexURL ? { indexURL } : {});
  let current = null;               // the run in progress; kept in this closure so kid code can't read its id
  let decoder, pending = "", total = 0, lastFlush = 0;

  function flush() {
    if (pending && current && !current.silent) post({ type: "stdout", id: current.id, text: pending });
    pending = ""; lastFlush = Date.now();
  }
  function write(bytes) {
    if (!current || current.silent) return bytes.length;
    const text = decoder.decode(bytes, { stream: true });
    if (total < MAX_OUTPUT_CHARS) {
      const keep = text.slice(0, MAX_OUTPUT_CHARS - total);
      pending += keep; total += keep.length;
    } else if (!current.capped) {
      current.capped = true;
      interruptBuffer[0] = 2;       // stop a runaway print loop
    }
    if (Date.now() - lastFlush > FLUSH_MS) flush();
    return bytes.length;
  }

  py.setStdout({ write });
  py.setStderr({ write });
  py.setStdin({ stdin: () => {
    flush();
    post({ type: "input", id: current.id });
    const answer = readInput();
    return (answer ?? "") + "\n";   // null means Stop was pressed; the interrupt ends the run
  } });
  py.setInterruptBuffer(interruptBuffer);
  py.registerJsModule("_codequest", { sleep_ms: ms => sleepMs(ms) });
  py.runPython(sources.harness, { dedent: false });
  py.runPython(sources.grading, { dedent: false });

  const call = (name, ...args) => {
    const proxy = py.globals.get(name)(...args);
    const value = typeof proxy === "string" ? proxy : proxy.toJs({ dict_converter: Object.fromEntries });
    proxy?.destroy?.();
    return value;
  };

  function begin(id, silent) {
    interruptBuffer[0] = 0;
    current = { id, silent, capped: false };
    decoder = new TextDecoder(); pending = ""; total = 0;
  }

  return {
    run({ id, code }) {
      begin(id, false);
      let res;
      try { res = call("run_visible", code); }
      catch (e) { res = { ok: false, kind: "Internal", text: String(e) }; }
      flush();
      const capped = current.capped;
      current = null;
      post({ type: "result", id, ...res, capped });
    },
    grade({ id, code, rule, starter, inputs, attempt }) {
      begin(id, true);
      let res;
      try { res = JSON.parse(call("grade_json", code, JSON.stringify(rule), starter || "", JSON.stringify(inputs || []), attempt || 1)); }
      catch (e) { res = { passed: false, feedback: "Something went wrong while checking your code. Try running it again.", internal: String(e) }; }
      current = null;
      post({ type: "graded", id, ...res });
    },
  };
}
