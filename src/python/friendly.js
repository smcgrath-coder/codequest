// Turns a run result into a message for a 9-12 year old, keyed on Python's own wording
// (pinned Pyodide version; see src/python/config.js). Python's real words are kept for "What Python said".
import { RUN_TIME_LIMIT_MS } from "./runner.js";

// Builtins that Python's "Did you mean" suggests but a kid almost never meant: print(Any) means the word, not any().
const SURPRISING = new Set(["help", "id", "iter", "hex", "oct", "ord", "chr", "dir", "vars", "hash", "exit", "quit",
  "open", "copyright", "credits", "license", "all", "any", "abs"]);

// Returns null for a clean run, else { headline, line, code, python }: the kid's message, the line
// Python pointed at and its code, and Python's own words.
export function friendlyError(r, code = "") {
  if (!r || r.ok) return null;
  if (r.kind === "Stopped") return { headline: stoppedMessage(r), line: null, code: "", python: "" };
  if (r.internal) return internalMessage(r.text || "");
  const lines = code.split("\n");
  const n = r.line ?? null, src = n ? (lines[n - 1] || "").trim() : "";
  const at = n ? `Line ${n}` : "Your code";
  const text = r.text || r.msg || "";
  for (const [kind, when, say] of rules(r, text, at, src, n)) {
    if (kind.test(r.kind) && when()) return { headline: say(), line: n, code: src, python: text };
  }
  return { headline: `${at}: ${text}`, line: n, code: src, python: text };   // unknown: Python's own words
}

function stoppedMessage(r) {
  if (r.capped) return "Your program printed so much that I stopped it. Is a print() stuck inside a loop that never ends?";
  if (r.timedOut) return `Your program was still running after ${RUN_TIME_LIMIT_MS / 1000} seconds, so I stopped it. Is there a loop that never ends? A while loop needs something inside it that makes the condition False, or a break.`;
  return "You stopped the program.";
}

// The harness itself broke (see worker-core.js), and runner.js has restarted Python. The traceback is of the
// harness's own code, so only its last line is kept for "What Python said". A raised recursion limit and a
// function that calls itself forever break Python this way, before its RecursionError can happen.
function internalMessage(text) {
  const last = text.trim().split("\n").pop();
  const hint = /Maximum call stack size exceeded/.test(text) ? " If it happens again, look for a function that keeps calling itself." : "";
  return { headline: `Something went wrong inside Python itself, so I've restarted it. Press Run to try again.${hint}`, line: null, code: "", python: last };
}

// Modules the course uses: its challenges import random and math, and time.sleep works. Python adds
// "Did you forget to import 'X'?" to any name that is also a module's name, including variable names
// kids pick, like numbers, queue or string, so only these get the import advice.
const TAUGHT = new Set(["random", "math", "time"]);
const CLOSER = { "(": ")", "[": "]", "{": "}" };
// total + "5" and total += "5" (Python says "for +=:" there) as well as "Score: " + 5.
const JOIN = /can only concatenate str \(not "(int|float)"\) to str|unsupported operand type\(s\) for \+=?: '(int|float)' and 'str'/;

// [error kinds, when it applies, what to say]. The first match wins. Kinds are anchored, so a kid's own
// class MyNameError(Exception) gets Python's own words, not the NameError message.
const rules = (r, text, at, src, n) => [
  [/^SyntaxError$/, () => /expected ':'/.test(text), () => `${at} needs a colon : at the end. Lines that start with if, elif, else, for, while or def always end with :`],
  [/^SyntaxError$/, () => /unterminated (triple-quoted )?string/.test(text), () => `${at} starts some text with a quote mark but never closes it. Add the matching " or ' at the end of the text.`],
  [/^SyntaxError$/, () => /Missing parentheses in call to 'print'/.test(text), () => `${at}: print needs round brackets. Write print("hello") instead of print "hello".`],
  [/^SyntaxError$/, () => /Maybe you meant '==' /.test(text), () => `${at} uses = inside a question. To compare, use == (two equals signs). One = is for storing a value.`],
  [/^SyntaxError$/, () => /'[([{]' was never closed/.test(text), () => {
    const open = text.match(/'([([{])' was never closed/)[1];
    return `${at} opens a bracket ${open} that never gets closed. Count your brackets: every ${open} needs a ${CLOSER[open]}.`;
  }],
  [/^IndentationError$/, () => /expected an indented block after .* on line \d+/.test(text), () => {
    const colon = +text.match(/on line (\d+)/)[1];
    // Python points at the first code after the colon. When there is none (untouched starter code, or
    // only comments), it points at a blank or comment line, or at the colon line itself.
    const before = colon === n - 1 ? "the line before it" : `line ${colon}`;
    if (n > colon && src && !src.startsWith("#")) return `${at} needs to be pushed in with 4 spaces, because ${before} ends with a colon.`;
    return `Line ${colon} ends with a colon, so it needs at least one line of code under it, pushed in with 4 spaces.`;
  }],
  [/^IndentationError$/, () => /unexpected indent/.test(text), () => `${at} is pushed in (indented) but it shouldn't be. Move it back so it lines up with the line above.`],
  [/^(IndentationError|TabError)$/, () => /unindent does not match|inconsistent use of tabs/.test(text), () => `${at}: the spaces at the start don't line up with any line above. Use exactly 4 spaces for each level.`],
  [/^(NameError|UnboundLocalError)$/, () => true, () => {
    const name = (text.match(/name '(\w+)' is not defined/) || text.match(/local variable '(\w+)'/) || [])[1] || "that name";
    const sug = (text.match(/Did you mean: '(\w+)'\?/) || [])[1];
    // ". Did you forget to import 'math'?" (or "Or did you forget" after a guess). See TAUGHT.
    const mod = (text.match(/[Dd]id you forget to import '(\w+)'\?/) || [])[1];
    if (/cannot access local variable/.test(text)) return `${at} uses ${name} before it has been given a value inside this function.`;
    // math.sqrt(4) uses it as a module. A bare time * 2, or numbers.append(n) before numbers = [], gets the
    // variable advice below: import numbers would only lead to "module 'numbers' has no attribute 'append'".
    const dotted = new RegExp(`\\b${name}\\s*\\.`).test(src);
    if (mod && TAUGHT.has(mod) && dotted) return `${at} uses ${mod}, which has to be imported first. Add import ${mod} at the top of your program.`;
    const inPrint = !dotted && new RegExp(`print\\([^)]*\\b${name}\\b`).test(src);   // print(scores.pop()) isn't the word scores
    if (sug && !SURPRISING.has(sug)) return `${at}: Python doesn't know ${name}. Did you mean ${sug}? Check the spelling.`;
    if (inPrint) return `${at}: ${name} isn't a variable yet. If you meant the words ${name}, put them in quotes: print("${name}"). If it's a variable, create it with = first.`;
    return `${at}: Python doesn't know ${name}. Create it with = before you use it, and check the spelling.`;
  }],
  // input() on this line, not already turned into a number with int(input()) or float(input()).
  [/^TypeError$/, () => JOIN.test(text) && /\binput\(/.test(src.replace(/\b(int|float)\(\s*input\(/g, "")), () => `${at} adds a number and what input() gave back. input() always gives text, even when someone types digits. Turn it into a number with int(input(...)) before doing math with it.`],
  [/^TypeError$/, () => JOIN.test(text), () => `${at} tries to join text and a number with +. Turn the number into text with str(), or use an f-string like f"Score: {score}".`],
  [/^ZeroDivisionError$/, () => true, () => `${at} divides by zero, and nobody can do that, not even a computer. Check the number after / or %.`],
  [/^IndexError$/, () => true, () => `${at} asks for a spot in the list that doesn't exist. Lists start counting at 0, so a list with 3 items has spots 0, 1 and 2.`],
  [/^KeyError$/, () => true, () => `${at} looks up the key ${r.msg}, but the dictionary doesn't have it. Check the spelling, or add that key first.`],
  [/^AttributeError$/, () => /Did you mean: '(\w+)'/.test(text), () => {
    const name = (text.match(/attribute '(\w+)'/) || [])[1], sug = text.match(/Did you mean: '(\w+)'/)[1];
    const call = name && new RegExp(`\\.\\s*${name}\\s*\\(`).test(src) ? "()" : "";   // () only if the kid's line called it
    return `${at}: there's no .${name}${call}. Did you mean .${sug}${call}?`;
  }],
  [/^ValueError$/, () => /invalid literal for int\(\)/.test(text), () => `${at}: int() can only turn digits like "42" into a number, not ${text.split(": ").pop()}.`],
  [/^RecursionError$/, () => true, () => `A function keeps calling itself forever. Make sure it has a case where it stops without calling itself again.`],
];
