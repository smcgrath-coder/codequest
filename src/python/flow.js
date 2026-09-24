// What happens when the kid presses Run: run the code for real, then grade it quietly.
// Falls back to the keyword grader when this device can't run Python.
import { friendlyError } from "./friendly.js";

// runner is { available, run, grade }, backed by runner.js in the game. attempt counts from 1, this one included.
// onGrading() is called just before the hidden grading pass, so the room can say it's checking; never without one.
// Resolves to { mode: "python" | "fallback", passes, feedback, error, keywordError, run, graded }; which
// fields are set depends on how far it got.
export async function runAndGrade({ code, challenge, rule, attempt, runner, fallbackGrade, onOutput, onInputRequest, onGrading }) {
  // The keyword grader (validateOffline) takes the number of earlier attempts, as the rooms have always passed it.
  const keyword = () => pick(fallbackGrade(code, challenge, attempt - 1));
  if (!runner.available()) return { mode: "fallback", ...keyword() };
  let run;
  try { run = await runner.run(code, { onOutput, onInputRequest }); }
  catch { return { mode: "fallback", ...keyword() }; }   // Python failed to load
  if (!run.ok) return { mode: "python", passes: false, run, error: friendlyError(run, code) };
  if (!rule) return { mode: "python", run, ...keyword() };
  let graded;
  onGrading?.();
  // gradeCode rejects like runCode. The kid has already seen the real output, so it's still a Python run.
  try { graded = await runner.grade(code, { rule, starter: challenge.starterCode || "", inputs: run.inputs || [], attempt }); }
  catch { return { mode: "python", run, ...keyword() }; }
  return { mode: "python", run, graded, passes: !!graded.passed, feedback: graded.feedback };
}

const pick = r => ({ passes: !!r.passes, feedback: r.feedback, keywordError: r.error || null });

// A "stuck" Run: the kid's own code ran cleanly (no crash, not stopped) but didn't pass, so the grader may
// be the one that's wrong. Without Python, a keyword error counts as a real mistake. Empty code, or the
// starter left as it was, can't be a misgraded answer. STUCK_TRIES_TO_MARK_DONE of these unlock the room's
// "mark it done" button.
export const STUCK_TRIES_TO_MARK_DONE = 3;
export function countsAsStuck(result, { code, starter = "" } = {}) {
  if (!result || result.passes) return false;
  if (code !== undefined && (!codeLines(code) || codeLines(code) === codeLines(starter))) return false;
  return result.mode === "fallback" ? !result.keywordError : !!result.run?.ok;
}

// The lines that do something: no blank lines, comment-only lines or trailing spaces.
const codeLines = src => src.split("\n").map(l => l.trimEnd()).filter(l => l.trim() && !l.trim().startsWith("#")).join("\n");
