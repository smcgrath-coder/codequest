// What happens when the kid presses Run: run the code for real, then grade it quietly.
// Falls back to the keyword grader when this device can't run Python.
import { friendlyError } from "./friendly.js";

// runner is { available, run, grade, restart }, backed by runner.js in the game. attempt counts from 1, this one included.
// onGrading() is called just before the hidden grading pass, so the room can say it's checking; never without one.
// Resolves to { mode: "python" | "fallback", passes, feedback, error, keywordError, run, graded, insides, late };
// which fields are set depends on how far it got. late: true is a fallback because Python is still loading.
export async function runAndGrade({ code, challenge, rule, attempt, runner, fallbackGrade, onOutput, onInputRequest, onGrading }) {
  // The keyword grader (validateOffline) takes the number of earlier attempts, as the rooms have always passed it.
  const keyword = () => pick(fallbackGrade(code, challenge, attempt - 1));
  if (!runner.available()) return { mode: "fallback", ...keyword() };
  let run;
  try { run = await runner.run(code, { onOutput, onInputRequest }); }
  catch (e) { return { mode: "fallback", ...keyword(), ...(e?.late && { late: true }) }; }   // Python failed to load, or is late
  // Kid code shares its interpreter with grading, so code that reaches into Python's insides could rewrite
  // grading or fake its reply. It still runs, so the kid sees what it printed, but it isn't graded, and Python
  // is restarted so nothing it changed can touch later runs. See reachesIntoPython().
  const insides = reachesIntoPython(code);
  if (insides) await runner.restart();
  if (!run.ok) return { mode: "python", passes: false, run, error: friendlyError(run, code) };
  if (insides) return { mode: "python", passes: false, run, insides: true, feedback: INSIDES_FEEDBACK };
  if (!rule) return { mode: "python", run, ...keyword() };
  let graded;
  onGrading?.();
  // gradeCode rejects like runCode. The kid has already seen the real output, so it's still a Python run.
  try { graded = await runner.grade(code, { rule, starter: challenge.starterCode || "", inputs: run.inputs || [], attempt }); }
  catch { return { mode: "python", run, ...keyword() }; }
  return { mode: "python", run, graded, passes: !!graded.passed, feedback: graded.feedback };
}

const pick = r => ({ passes: !!r.passes, feedback: r.feedback, keywordError: r.error || null });

// Names no challenge needs that lead into the interpreter's own workings: the globals and frames of the
// harness's and grading's functions (time.sleep.__globals__, sys._getframe(1).f_globals), code and class
// internals, the garbage collector, and the JavaScript side (import js, pyodide, _codequest), where kid code
// could replace the worker's message handler. Also the ways to reach a name without typing it: getattr and
// its kin, vars, getmembers, and running code from a string (exec, compile), each only where it is called, so
// the words can still appear in a story ("You inspect the chest"). Matched anywhere in the source, strings
// included, so getattr(f, "__globals__") counts too, after NFKC normalization, as Python reads a fullwidth
// letter in a name as the plain one. A name built while the program runs still gets past it: it stops
// copy-paste cheats and accidents, not a determined kid, who can always fake their own progress on their own
// device. No reference, alternative or wrong answer in tests/fixtures, and no starter code, uses any of them.
const INSIDES = [
  /\b(__globals__|__code__|__subclasses__|__import__|__dict__|__closure__|__getattribute__|__builtins__|__self__|_getframe|f_globals|f_locals|f_back|f_builtins|tb_frame|gi_frame|cr_frame|_codequest|ctypes|importlib|getmembers)\b/,
  /(?:^|[^.\w])(getattr|setattr|delattr|vars|compile|exec)\s*\(/,   // the built-in called: not a word in a story, nor re.compile
  // (no lookbehind: Safari before 16.4 can't parse one, and those devices need this file for the fallback)
  /\.\s*modules\b/,   // sys.modules
  /pyodide/,     // anywhere in a name: pyodide, pyodide_js, and the _pyodide modules already in sys.modules
  ...["js", "gc", "inspect", "builtins"].flatMap(m => [
    new RegExp(`\\bimport\\s+([\\w.]+(\\s+as\\s+\\w+)?\\s*,\\s*)*${m}\\b`),   // import js, import random, js
    new RegExp(`\\bfrom\\s+${m}(\\.[\\w.]+)?\\s+import\\b`),   // from js import self, not "from js land"
  ]),
];
export const reachesIntoPython = code => (norm => INSIDES.some(re => re.test(norm)))(code.normalize("NFKC"));
const INSIDES_FEEDBACK = "Your program reaches into Python's insides, so I can't check it. Take that part out and press Run again.";

// A "stuck" Run: the kid's own code ran cleanly (no crash, not stopped) but didn't pass, so the grader may
// be the one that's wrong. Without Python, a keyword error counts as a real mistake. Empty code, or the
// starter left as it was, can't be a misgraded answer. Nor can code that was never judged: a grading pass
// that was stopped (Stop during "Checking your code…") or ran too long, or code that wasn't graded because it
// reaches into Python's insides. STUCK_TRIES_TO_MARK_DONE of these unlock the room's "mark it done" button.
export const STUCK_TRIES_TO_MARK_DONE = 3;
export function countsAsStuck(result, { code, starter = "" } = {}) {
  if (!result || result.passes || result.insides || result.graded?.stopped || result.graded?.timedOut) return false;
  if (code !== undefined && (!codeLines(code) || codeLines(code) === codeLines(starter))) return false;
  return result.mode === "fallback" ? !result.keywordError : !!result.run?.ok;
}

// The lines that do something: no blank lines, comment-only lines or trailing spaces.
const codeLines = src => src.split("\n").map(l => l.trimEnd()).filter(l => l.trim() && !l.trim().startsWith("#")).join("\n");
