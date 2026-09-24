// Prototype: turn a run_submission() result into a message for a 9-12 year old.
// Keyed on CPython's own wording (identical in 3.13 and Pyodide's 3.14).
const SURPRISING = new Set(["help", "id", "iter", "hex", "oct", "ord", "chr", "dir", "vars", "hash", "exit", "quit", "open", "copyright", "credits", "license", "all", "any", "abs"]);
export function friendly(r, code) {
  if (r.ok) return null;
  const lines = code.split("\n");
  const n = r.line, src = n ? (lines[n - 1] || "").trim() : "";
  const at = n ? `Line ${n}` : "Your code";
  const text = r.text || r.msg || "";
  const rules = [
    [/^Timeout$/, () => r.kind === "Timeout", () => `Your program ran for too long, so I stopped it. Is there a loop that never ends? A while loop needs something inside it that makes the condition False, or a break.`],
    [/SyntaxError/, () => /expected ':'/.test(text), () => `${at} needs a colon : at the end. Lines that start with if, elif, else, for, while or def always end with :`],
    [/SyntaxError/, () => /unterminated (triple-quoted )?string/.test(text), () => `${at} starts some text with a quote mark but never closes it. Add the matching " or ' at the end of the text.`],
    [/SyntaxError/, () => /Missing parentheses in call to 'print'/.test(text), () => `${at}: print needs round brackets. Write print("hello") instead of print "hello".`],
    [/SyntaxError/, () => /Maybe you meant '==' /.test(text), () => `${at} uses = inside a question. To compare, use == (two equals signs). One = is for storing a value.`],
    [/SyntaxError/, () => /'(\(|\[|\{)' was never closed/.test(text), () => `${at} opens a bracket ${text.match(/'(.)'/)[1]} that never gets closed. Count your brackets: every ( needs a ).`],
    [/IndentationError/, () => /expected an indented block after .* on line (\d+)/.test(text), () => { const k = text.match(/on line (\d+)/)[1]; return `Line ${k} ends with a colon, so the line after it must be pushed in with 4 spaces.`; }],
    [/IndentationError/, () => /unexpected indent/.test(text), () => `${at} is pushed in (indented) but it shouldn't be. Move it back so it lines up with the line above.`],
    [/IndentationError|TabError/, () => /unindent does not match|inconsistent use of tabs/.test(text), () => `${at}: the spaces at the start don't line up with any line above. Use exactly 4 spaces for each level.`],
    [/NameError|UnboundLocalError/, () => true, () => {
      const name = (text.match(/name '(\w+)' is not defined/) || text.match(/local variable '(\w+)'/) || [])[1] || "that name";
      const sug = (text.match(/Did you mean: '(\w+)'\?/) || [])[1];
      if (/cannot access local variable/.test(text)) return `${at} uses ${name} before it has been given a value inside this function.`;
      const inPrint = new RegExp(`print\\([^)]*\\b${name}\\b`).test(src);
      if (sug && !SURPRISING.has(sug)) return `${at}: Python doesn't know ${name}. Did you mean ${sug}? Check the spelling.`;
      if (inPrint) return `${at}: ${name} isn't a variable yet. If you meant the words ${name}, put them in quotes: print("${name}"). If it's a variable, create it with = first.`;
      return `${at}: Python doesn't know ${name}. Create it with = before you use it, and check the spelling.`;
    }],
    [/TypeError/, () => /can only concatenate str \(not "(int|float)"\) to str|unsupported operand type\(s\) for \+: '(int|float)' and 'str'/.test(text), () => `${at} tries to join text and a number with +. Turn the number into text with str(), or use an f-string like f"Score: {score}".`],
    [/ZeroDivisionError/, () => true, () => `${at} divides by zero, and nobody can do that, not even a computer. Check the number after / or %.`],
    [/IndexError/, () => true, () => `${at} asks for a spot in the list that doesn't exist. Lists start counting at 0, so a list with 3 items has spots 0, 1 and 2.`],
    [/KeyError/, () => true, () => `${at} looks up the key ${r.msg}, but the dictionary doesn't have it. Check the spelling, or add that key first.`],
    [/AttributeError/, () => /Did you mean: '(\w+)'/.test(text), () => `${at}: there's no .${(text.match(/attribute '(\w+)'/) || [])[1]}(). Did you mean .${text.match(/Did you mean: '(\w+)'/)[1]}()?`],
    [/ValueError/, () => /invalid literal for int\(\)/.test(text), () => `${at}: int() can only turn digits like "42" into a number, not ${text.split(": ").pop()}.`],
    [/RecursionError/, () => true, () => `A function keeps calling itself forever. Make sure it has a case where it stops without calling itself again.`],
  ];
  for (const [kind, when, say] of rules) if (kind.test(r.kind) && when()) return { line: n, code: src, message: say() };
  return { line: n, code: src, message: `${at}: ${text}` };  // unknown: show Python's own words
}
