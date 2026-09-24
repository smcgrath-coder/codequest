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
