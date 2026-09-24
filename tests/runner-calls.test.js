// How the runner handles time limits, input(), Stop and overlapping calls, against a fake worker
// on a fake clock. The real worker is checked in the browser (Task 15).
import { test, beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import { runCode, gradeCode, stopCode, answerInput, pythonStatus } from "../src/python/runner.js";

// Stands in for py.worker.js. Each line of the code is one step:
//   ask      waits at input() until the page answers or cancels
//   print X  prints X
//   spin     loops until interrupted
//   except   (first line) swallows interrupts, like a bare except:, so only terminate() ends it
// Its thread takes one step per slice of fake time (see advance()).
const workers = [];
class FakeWorker {
  static broken = false;   // new Worker() throws, as when the browser can't start one
  constructor() {
    if (FakeWorker.broken) throw new Error("Worker can't start");
    workers.push(this); this.jobs = []; this.sent = []; this.dead = false;
  }
  postMessage(m) {
    if (m.type === "init") { this.interrupt = new Int32Array(m.interrupt); this.box = new Int32Array(m.input, 0, 2); this.booting = true; return; }
    structuredClone(m);    // throws DataCloneError for what a real worker couldn't be sent, such as a function
    this.sent.push(m);
    const steps = m.code.split("\n"), stubborn = steps[0] === "except";
    this.jobs.push({ ...m, steps: stubborn ? steps.slice(1) : steps, stubborn });
  }
  terminate() { this.dead = true; }
  send(data) { this.onmessage({ data }); }
  end(res) { const job = this.jobs.shift(); this.send({ ...res, type: job.type === "grade" ? "graded" : "result", id: job.id }); }
  step() {
    const job = this.jobs[0];
    if (this.dead) return;
    if (this.booting) { this.booting = false; return this.send({ type: "ready" }); }
    if (!job) return;
    if (!job.started) { job.started = true; this.interrupt[0] = 0; }   // as worker-core's begin() does
    if (job.waiting) {   // blocked in Atomics.wait until the mailbox changes
      if (Atomics.load(this.box, 0) === 0) return;
      Atomics.store(this.box, 0, 0); job.waiting = false; job.steps.shift(); return;
    }
    if (this.interrupt[0] === 2 && !job.stubborn) {
      this.interrupt[0] = 0;
      // Grading treats the interrupt as the kid's error, so its own feedback would mislead.
      return this.end(job.type === "grade" ? { passed: false, feedback: "KeyboardInterrupt" } : { ok: false, kind: "Stopped" });
    }
    const [op, text] = (job.steps[0] || "end").split(" ");
    if (op === "ask") { job.waiting = true; this.send({ type: "input", id: job.id }); }
    else if (op === "print") { this.send({ type: "stdout", id: job.id, text: text + "\n" }); job.steps.shift(); }
    else if (op !== "spin") this.end(job.type === "grade" ? { passed: true, feedback: "Nice!" } : { ok: true, kind: null });
  }
}
globalThis.Worker = FakeWorker;
globalThis.crossOriginIsolated = true;

beforeEach(() => mock.timers.enable({ apis: ["setTimeout"] }));
afterEach(() => mock.timers.reset());

// Moves the fake clock on in 50 ms slices. In each slice the worker takes a step and promises settle.
async function advance(ms) {
  for (let t = 0; t < ms; t += 50) {
    workers.forEach(w => w.step());
    mock.timers.tick(50);
    await new Promise(r => setImmediate(r));
  }
}
function track(promise) {
  const t = { done: false };
  promise.then(v => Object.assign(t, { done: true, value: v }), e => Object.assign(t, { done: true, error: e }));
  return t;
}

test("the run time limit pauses while input() waits for the kid", async () => {
  let asked = 0;
  const run = track(runCode("ask\nspin", { onInputRequest: () => asked++ }));
  await advance(30_000);   // a kid can take as long as they like to answer
  assert.equal(asked, 1);
  assert.equal(run.done, false, "still waiting for the answer");
  answerInput("Sam");
  await advance(9_500);
  assert.equal(run.done, false, "the clock starts again from the answer");
  await advance(1_000);
  assert.equal(run.done, true);
  assert.equal(run.value.kind, "Stopped");
  assert.equal(run.value.timedOut, true);
  assert.deepEqual(run.value.inputs, ["Sam"]);
});

test("a new run stops one left waiting at input(), and the old run's timers can't touch it", async () => {
  // The kid presses Back at an input() prompt, then Run in another room.
  const left = track(runCode("ask"));
  await advance(3_000);
  const spawned = workers.length;
  const next = track(runCode("ask\nprint hi"));
  await advance(100);
  assert.equal(left.done, true, "the new run stops the old one");
  assert.equal(left.value.kind, "Stopped");
  assert.equal(left.value.stopped, true);
  await advance(20_000);   // well past the old run's limit and grace time
  assert.equal(next.done, false, "the new run is still waiting for its answer");
  answerInput("Sam");
  await advance(200);
  assert.equal(next.done, true);
  assert.equal(next.value.ok, true);
  assert.equal(next.value.stdout, "Sam\nhi\n");
  assert.deepEqual(next.value.inputs, ["Sam"]);
  assert.equal(workers.length, spawned, "no restart");
});

test("Stop and a newer call also stop calls still waiting for their turn", async () => {
  const stuck = track(runCode("except\nspin"));   // swallows Stop, so only a restart ends it
  await advance(100);
  const spawned = workers.length;
  const second = track(runCode("print second"));   // stops the stuck run, then waits for the worker
  const third = track(runCode("print third"));     // stops the second run before it starts
  stopCode();                                       // stops the third one
  await advance(3_000);
  assert.equal(stuck.value.kind, "Stopped");
  assert.equal(stuck.value.restarted, true);
  for (const call of [second, third]) {
    assert.equal(call.value.kind, "Stopped");
    assert.equal(call.value.stopped, true);
    assert.equal(call.value.stdout, "", "never ran");
  }
  assert.equal(workers.length, spawned + 1, "one restart");
  const fresh = track(runCode("print fresh"));
  await advance(200);
  assert.equal(fresh.value.ok, true);
  assert.equal(fresh.value.stdout, "fresh\n");
});

test("a stopped run reports Stopped even if it finished anyway, so its room won't grade it", async () => {
  const run = track(runCode("except\nask\nprint hi"));   // a bare except: swallows Stop and the program ends normally
  await advance(100);
  stopCode();
  await advance(200);
  assert.equal(run.done, true);
  assert.equal(run.value.ok, false);
  assert.equal(run.value.kind, "Stopped");
  assert.equal(run.value.stopped, true);
});

test("a new run or Stop also ends a grading pass, which says it was stopped", async () => {
  const grade = track(gradeCode("spin", { rule: {} }));
  await advance(100);
  const run = track(runCode("print hi"));
  await advance(200);
  assert.equal(grade.done, true);
  assert.equal(grade.value.passed, false);
  assert.equal(grade.value.stopped, true);
  assert.match(grade.value.feedback, /stopped/);
  assert.equal(run.value.ok, true);

  const again = track(gradeCode("spin", { rule: {} }));
  await advance(100);
  stopCode();
  await advance(200);
  assert.equal(again.value.stopped, true);
  assert.equal(pythonStatus(), "ready");
});

test("a grading pass that runs too long says so, not what grading made of the interrupt", async () => {
  const grade = track(gradeCode("spin", { rule: {} }));
  await advance(8_200);
  assert.equal(grade.done, true);
  assert.equal(grade.value.passed, false);
  assert.equal(grade.value.timedOut, true);
  assert.match(grade.value.feedback, /took too long/);
});

test("only the worker's own boot report counts: a later ready, fatal, error or junk message is ignored", async () => {
  const first = track(runCode("print hi"));
  await advance(200);
  assert.equal(first.value.ok, true);
  const w = workers.at(-1);
  // Kid code can post to the page through `import js`, or leave an error for the worker to throw.
  for (const data of [null, 42, { type: "fatal", msg: "hacked" }, { type: "ready" }]) w.send(data);
  w.onerror({ message: "thrown later by kid code" });
  assert.equal(pythonStatus(), "ready");
  const next = track(runCode("print again"));
  await advance(200);
  assert.equal(next.value.stdout, "again\n");
});

test("a second Enter before the page catches up doesn't answer the next input()", async () => {
  let asked = 0;
  const run = track(runCode("ask\nask\nprint done", { onInputRequest: () => asked++ }));
  await advance(200);
  assert.equal(asked, 1);
  answerInput("Sam");
  await advance(50);    // the worker takes the answer before the page has re-rendered
  answerInput("Sam");   // Enter again in the same box
  await advance(3_000);
  assert.equal(asked, 2);
  assert.equal(run.done, false, "the second input() still waits for its own answer");
  answerInput("Max");
  await advance(200);
  assert.deepEqual(run.value.inputs, ["Sam", "Max"]);
  assert.equal(run.value.stdout, "Sam\nMax\ndone\n");
});

test("an answer typed after Stop is dropped", async () => {
  let asked = 0;
  const run = track(runCode("ask\nprint hi", { onInputRequest: () => asked++ }));
  await advance(200);
  assert.equal(asked, 1);
  stopCode();
  answerInput("late");
  await advance(200);
  assert.equal(run.value.stopped, true);
  assert.deepEqual(run.value.inputs, []);
  assert.equal(run.value.stdout, "");
});

test("a call that can't be sent to the worker leaves no timer behind to stop a later call", async () => {
  const run = track(runCode(() => {}));
  await advance(100);
  const grade = track(gradeCode(() => {}, { rule: {} }));
  await advance(100);
  assert.equal(run.error?.name, "DataCloneError");
  assert.equal(grade.error?.name, "DataCloneError");
  const spawned = workers.length;
  const next = track(runCode("ask\nprint hi"));
  await advance(12_000);   // past both failed calls' time limits and grace
  assert.equal(workers.length, spawned, "no restart under the next call");
  assert.equal(next.done, false, "still waiting for its answer");
  answerInput("Sam");
  await advance(200);
  assert.equal(next.value.ok, true);
  assert.equal(next.value.stdout, "Sam\nhi\n");
});

test("a grading pass sends its rule and inputs as JSON text, made with the JSON.stringify the page started with", async () => {
  // The worker passes the text on as it is: turning objects into JSON there would let kid code change them.
  const saved = JSON.stringify;
  JSON.stringify = () => '"hacked"';
  try {
    const grade = track(gradeCode("print hi", { rule: { output: [{ expr: "lines(['hi'])" }] }, starter: "# go", inputs: ["Sam"], attempt: 2 }));
    await advance(200);
    assert.equal(grade.value.passed, true);
  } finally { JSON.stringify = saved; }
  const { type, code, rule, starter, inputs, attempt } = workers.at(-1).sent.at(-1);
  assert.deepEqual({ type, code, rule, starter, inputs, attempt },
    { type: "grade", code: "print hi", rule: `{"output":[{"expr":"lines(['hi'])"}]}`, starter: "# go", inputs: '["Sam"]', attempt: 2 });
});

// Last: these leave Python unavailable until a later call starts a worker again.
for (const [kind, start] of [["run", () => runCode("except\nspin")], ["grading pass", () => gradeCode("except\nspin", { rule: {} })]]) {
  test(`a stuck ${kind} still ends if its worker can't be restarted, and the next call rejects instead of waiting`, async () => {
    const stuck = track(start());   // swallows Stop, so only a restart ends it
    await advance(100);
    stopCode();
    await advance(950);
    FakeWorker.broken = true;
    try {
      // The grace timer's restart throws. Mock timers run a callback that threw again on every
      // tick, so the clock stays put from here on.
      assert.throws(() => mock.timers.tick(50), /can't start/);
      await new Promise(r => setImmediate(r));
      assert.equal(stuck.done, true, "the stuck call still ends");
      assert.equal(stuck.value.stopped, true);
      const next = track(runCode("print hi"));
      await new Promise(r => setImmediate(r));
      assert.match(next.error?.message ?? "(still waiting)", /can't start/);
      assert.equal(pythonStatus(), "unavailable");
    } finally { FakeWorker.broken = false; }
  });
}
