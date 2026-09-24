// The Python side of the runner: shared by the browser worker (py.worker.js) and the tests.
const MAX_OUTPUT_CHARS = 100_000;   // about 2,000 lines of typical output
const FLUSH_MS = 50;
// Kid code shares this thread and can reach its JavaScript through `import js`. The functions results
// pass through are captured here, before any kid code runs, which stops accidental and casual tampering
// such as patching js.JSON.parse. Grading's rule and inputs arrive as JSON text made on the page and are
// passed on as they are: turning objects into JSON here would let kid code change them with an inherited
// toJSON. A determined kid can still fake their own local progress: grading runs on the kid's own device
// by design, so nothing here is proof against its owner.
const jsonParse = JSON.parse, fromEntries = Object.fromEntries;

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
    const keep = text.slice(0, MAX_OUTPUT_CHARS - total);
    pending += keep; total += keep.length;
    if (keep.length < text.length && !current.capped) {
      current.capped = true;
      interruptBuffer[0] = 2;       // stop a runaway print loop
    }
    if (Date.now() - lastFlush > FLUSH_MS) flush();
    return bytes.length;
  }

  py.setStdout({ write });
  py.setStderr({ write });
  py.setStdin({ stdin: () => {
    if (!current || current.silent) return null;   // end of file: grading must never open the input box
    flush();
    post({ type: "input", id: current.id });
    const answer = readInput();
    return (answer ?? "") + "\n";   // null means Stop was pressed; the interrupt ends the run
  } });
  py.setInterruptBuffer(interruptBuffer);
  // Flush first: nothing else can send output while the worker naps.
  py.registerJsModule("_codequest", { sleep_ms: ms => { flush(); sleepMs(ms); } });
  py.runPython(sources.harness, { dedent: false });
  py.runPython(sources.grading, { dedent: false });

  // Looked up once, so kid code that rebinds them in __main__ can't take over later runs.
  const runVisible = py.globals.get("run_visible"), gradeJson = py.globals.get("grade_json");
  const call = (fn, ...args) => {
    const proxy = fn(...args);
    const value = typeof proxy === "string" ? proxy : proxy.toJs({ dict_converter: fromEntries });
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
      try { res = call(runVisible, code); }
      catch (e) {
        // The cap or a Stop can land in the harness's own code, such as its final flush.
        res = e?.type === "KeyboardInterrupt" ? { ok: false, kind: "Stopped", msg: "", line: null, text: "" }
          : { ok: false, kind: "Internal", text: String(e) };
      }
      flush();
      const capped = current.capped;
      current = null;
      post({ ...res, capped, type: "result", id });   // envelope last, so fields from Python can't replace it
    },
    // rule and inputs are JSON text (see runner.js's gradeCode).
    grade({ id, code, rule, starter, inputs, attempt }) {
      begin(id, true);
      let res;
      try { res = jsonParse(call(gradeJson, code, rule, starter || "", inputs || "[]", attempt || 1)); }
      catch (e) { res = { passed: false, feedback: "Something went wrong while checking your code. Try running it again.", internal: String(e) }; }
      current = null;
      post({ ...res, type: "graded", id });
    },
  };
}
