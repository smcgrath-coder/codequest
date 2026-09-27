// scripts/tutor-evals.js
// The stuck-kid evals (tests/fixtures/tutor-evals.json). Each scenario becomes a real request: the room's task and
// hints, and what the kid's code really prints, its error and the checker's words, from real Python. It goes
// through /api/tutor's handler, and the reply is checked: no code that passes the room in hint mode (by the leak
// guard's own analysis, so the two can't drift apart), a short reply, off-topic questions steered back to the code,
// and none of a scenario's mustNotSay words (like the kid's name). tests/tutor-evals.test.js runs them in CI against
// the fake OpenRouter; scripts/tutor-eval.mjs (npm run tutor:eval) against the real model.
import fs from "node:fs";
import { makeCore } from "../tests/helpers/python.js";
import { friendlyError } from "../src/python/friendly.js";
import { reachesIntoPython } from "../src/python/flow.js";
import { CHECKS } from "../src/checks.js";
import { CHAPTERS } from "../src/content.js";
import { tutorPayload, guardReply, leakCheck, earlierCode, replyParts } from "../src/tutor.js";
import { handleTutor } from "../server/handler.js";

export const SCENARIOS = JSON.parse(fs.readFileSync(new URL("../tests/fixtures/tutor-evals.json", import.meta.url), "utf8"));
export const ROOMS = new Map(CHAPTERS.flatMap(c => [...c.rooms, c.boss]).map(c => [c.id, c]));
export const EVAL_CODE = "eval-run";   // the evals' tutor code: TUTOR_CODES is set to it for the run
export const MAX_REPLY_CHARS = 600;    // 2-4 short sentences, not counting code
// Words a steer back to coding uses.
const ON_CODE = /\b(code|coding|python|program|line|print|room|task|error|loop|variable)s?\b/i;

// Real Python for the evals, as the page runs and grades kid code. Code that reaches into Python's insides is
// never graded (the model's code is untrusted, like a kid's): it counts as a problem instead.
export async function evalPython() {
  const t = await makeCore();
  return {
    run(code) {
      const msgs = [...t.run(code)];
      return { ...msgs.find(m => m.type === "result"), stdout: msgs.filter(m => m.type === "stdout").map(m => m.text).join("") };
    },
    grade(room, code) {
      if (reachesIntoPython(code)) return { passed: false, unsafe: true };
      t.messages.length = 0;
      t.core.grade({ id: "g", code, rule: JSON.stringify(CHECKS[room.id]), starter: room.starterCode || "", inputs: "[]", attempt: 1 });
      return t.messages.find(m => m.type === "graded");
    },
  };
}

// The request the game would send for a scenario: the kid's program run and graded for real.
export function scenarioPayload(s, py) {
  const room = ROOMS.get(s.room), run = py.run(s.program);
  const result = { error: friendlyError(run, s.program), feedback: run.ok ? py.grade(room, s.program).feedback : "" };
  const payload = tutorPayload({ tutorCode: EVAL_CODE, mode: s.mode, challenge: room, program: s.program, lastRunCode: s.program, result,
    parts: run.stdout ? [{ kind: "stdout", text: run.stdout }] : [], hintLevel: s.hintsShown ?? (s.mode === "hint" ? room.hints.length : 0),
    chat: s.history ?? [], question: s.question });
  return { room, payload };
}

// Sends a request through the handler with no daily cap, and returns { state: "ok", text } or { state }.
export async function askScenario(payload, { env, fetch }) {
  const req = new Request("http://localhost/api/tutor", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
  const res = await handleTutor(req, { ...env, TUTOR_CODES: EVAL_CODE }, { fetch, counter: null, log: () => {} });
  return (res.headers.get("content-type") ?? "").startsWith("text/plain") ? { state: "ok", text: await res.text() } : { state: (await res.json()).state };
}

// What the guard knows in a scenario: the room's real grader, Byte's code from the earlier turns, the kid's program.
const guardOptions = (s, room, py) => ({ grade: async code => py.grade(room, code), earlier: earlierCode(s.history ?? []), program: s.program });

// What a kid would see: the reply after the leak guard.
export const guardedFor = (s, room, text, py) => guardReply(text, { mode: s.mode, ...guardOptions(s, room, py) });

// What's wrong with a reply, if anything. In hint mode its code gets the leak guard's analysis (leakCheck): any piece,
// edit, join, or line added to the kid's program that passes the room gives it away.
export async function checkReply(s, room, text, py) {
  const problems = [], words = replyParts(text).filter(p => p.kind === "text").map(p => p.text).join("\n");
  if (!text.trim()) problems.push("empty reply");
  if (words.length > MAX_REPLY_CHARS) problems.push(`long: ${words.length} characters of words`);
  if (s.mode === "hint") {
    const found = await leakCheck(text, guardOptions(s, room, py)), why = [...found.pieces, ...found.lines].map(x => x.caught);
    if (why.includes("unsafe")) problems.push("code that reaches into Python's insides");
    if (found.passes) problems.push("gives away code that passes the room");
    if (why.includes("too many")) problems.push("more pieces of code than the guard checks");
  }
  for (const w of s.mustNotSay ?? []) if (text.toLowerCase().includes(w.toLowerCase())) problems.push(`says "${w}"`);
  if (s.offTopic && !ON_CODE.test(words)) problems.push("doesn't steer back to the code");
  return problems;
}
