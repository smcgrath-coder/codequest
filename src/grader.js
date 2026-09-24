// ═══════════════════════════════════════════════════════════════════
// NON-LLM VALIDATION ENGINE (Built-in Guide mode)
// ═══════════════════════════════════════════════════════════════════

// Removes comments and blanks the literal text of strings (quotes and prefixes
// such as f"" are kept), so the rules below only ever look at real code. A
// string stays on the line where it starts, even a multi-line one. The
// {expressions} inside an f-string are code, so they are kept. Also reports
// whether a string was left without its closing quote.
function scanCode(code) {
  let i = 0, openString = false, fDepth = 0;
  const isQuote = ch => ch === '"' || ch === "'";
  const prefixOf = text => (text.match(/(?:^|[^\w])([rRbBfFuU]{1,2})$/) || [])[1] || "";

  function readString(prefix) {
    const q = code.startsWith(code[i].repeat(3), i) ? code[i].repeat(3) : code[i];
    const isF = /f/i.test(prefix) && fDepth < 20;
    let out = q;
    i += q.length;
    while (i < code.length && !code.startsWith(q, i)) {
      const ch = code[i];
      if (ch === "\n") {
        if (q.length === 1) { openString = true; return out; }
        i++;
      } else if (ch === "\\") {
        // In a raw string a backslash is ordinary unless it precedes the quote or another backslash.
        i += /r/i.test(prefix) && code[i + 1] !== q[0] && code[i + 1] !== "\\" ? 1 : 2;
      } else if (isF && ch === "{") {
        if (code[i + 1] === "{") { i += 2; continue; }
        i++;
        fDepth++;
        out += "{" + readExpression(q) + "}";
        fDepth--;
      } else {
        i++;
      }
    }
    if (code.startsWith(q, i)) { out += q; i += q.length; }
    else openString = true;
    return out;
  }

  // Code inside an f-string's braces, up to the matching '}'. A debug '='
  // ({x=}), a conversion (!r) and a format spec (:>5) are not code.
  function readExpression(q) {
    let out = "", depth = 0;
    while (i < code.length) {
      const ch = code[i];
      if (ch === "}" && depth === 0) { i++; return out; }
      if (ch === "\n" && q.length === 1 && depth === 0) return out;
      if (isQuote(ch)) { out += readString(prefixOf(out.slice(-3))); continue; }
      if (depth === 0 && (ch === ":" || (ch === "!" && code[i + 1] !== "="))) { skipFormatSpec(q); continue; }
      if (depth === 0 && ch === "=" && !"=!<>".includes(out.trimEnd().slice(-1)) && /^\s*[}!:]/.test(code.slice(i + 1))) { i++; continue; }
      if ("([{".includes(ch)) depth++;
      else if (")]}".includes(ch)) depth--;
      out += ch; i++;
    }
    return out;
  }

  // Skips a conversion/format spec up to the closing '}' of the replacement
  // field, reading any nested {fields} (as in {x:{width}}) as code.
  function skipFormatSpec(q) {
    while (i < code.length && code[i] !== "}" && !code.startsWith(q, i)) {
      if (code[i] === "\n" && q.length === 1) return;
      if (code[i] === "{") { i++; readExpression(q); continue; }
      i++;
    }
  }

  let out = "";
  while (i < code.length) {
    const ch = code[i];
    if (ch === "#") { while (i < code.length && code[i] !== "\n") i++; continue; }
    if (isQuote(ch)) { out += readString(prefixOf(out.slice(-3))); continue; }
    out += ch; i++;
  }
  return { clean: out, openString };
}

export function stripCode(code) {
  return scanCode(code).clean;
}

// Joins physical lines that continue inside brackets or after a backslash.
function logicalLines(clean) {
  const result = [];
  let buf = "", depth = 0;
  for (const line of clean.split("\n")) {
    buf = buf ? buf + " " + line.trim() : line;
    for (const ch of line) {
      if ("([{".includes(ch)) depth++;
      else if (")]}".includes(ch)) depth = Math.max(0, depth - 1);
    }
    if (depth === 0 && !line.trimEnd().endsWith("\\")) { result.push(buf); buf = ""; }
  }
  if (buf) result.push(buf);
  return result;
}

// Keywords followed by a non-identifier character (accented names like forêt are not keywords).
const BLOCK_KEYWORD = /^(if|elif|else|for|while|def|class|try|except|finally|with)(?![\p{L}\p{N}_])/u;
const BARE_KEYWORDS = ["else", "try", "finally"];

// Index of the colon that ends a block header, ignoring colons inside brackets
// and the walrus operator; -1 if the header has no colon.
function headerColon(stmt) {
  let depth = 0;
  for (let i = 0; i < stmt.length; i++) {
    const ch = stmt[i];
    if ("([{".includes(ch)) depth++;
    else if (")]}".includes(ch)) depth--;
    else if (ch === ":" && depth === 0 && stmt[i + 1] !== "=") return i;
  }
  return -1;
}

function blockHeaders(clean) {
  return logicalLines(clean)
    .map(l => l.trim())
    .map(stmt => ({ stmt, kw: (stmt.match(BLOCK_KEYWORD) || [])[1] }))
    .filter(h => h.kw);
}

function missingColon(clean) {
  for (const { stmt, kw } of blockHeaders(clean)) {
    const ok = BARE_KEYWORDS.includes(kw)
      ? /^[a-z]+\s*:/.test(stmt)
      : headerColon(stmt) !== -1;
    if (!ok) return kw;
  }
  return null;
}

const NOT_A_CALL = new Set(["not", "and", "or", "in", "is", "if", "elif", "while", "else", "return", "lambda"]);

// A single '=' in an if/elif/while condition, unless it is a keyword argument
// inside a call or a lambda default: `if f(a=1):` is fine, `if (x = 5):` is not.
function assignmentInCondition(clean) {
  return blockHeaders(clean).some(({ stmt, kw }) => {
    if (!["if", "elif", "while"].includes(kw)) return false;
    const colon = headerColon(stmt);
    const cond = stmt.slice(kw.length, colon === -1 ? stmt.length : colon);
    const open = [];
    for (let i = 0; i < cond.length; i++) {
      const ch = cond[i];
      if ("([{".includes(ch)) {
        const before = cond.slice(0, i).trimEnd();
        const word = (before.match(/[\p{L}\p{N}_]+$/u) || [])[0];
        const call = ch === "(" && ((word && !NOT_A_CALL.has(word)) || /[)\]]$/.test(before));
        open.push({ call, lambda: false });
      } else if (")]}".includes(ch)) {
        open.pop();
      } else if (cond.startsWith("lambda", i) && !/[\p{L}\p{N}_]/u.test(cond[i - 1] || "") && open.length) {
        open[open.length - 1].lambda = true;
      } else if (ch === "=" && !"=!<>:".includes(cond[i - 1]) && cond[i + 1] !== "=") {
        const top = open[open.length - 1];
        if (!top || (!top.call && !top.lambda)) return true;
      }
    }
    return false;
  });
}

// True when some (, [ or { is never closed.
function unclosedBracket(clean) {
  let depth = 0;
  for (const ch of clean) {
    if ("([{".includes(ch)) depth++;
    else if (")]}".includes(ch)) depth = Math.max(0, depth - 1);
  }
  return depth > 0;
}

const IDENT = /[\p{L}_][\p{L}\p{N}_]*/gu;
const BUILTINS = new Set(("True False None NotImplemented Ellipsis __name__ abs all any ascii bin bool breakpoint " +
  "bytearray bytes callable chr classmethod compile complex delattr dict dir divmod enumerate eval exec exit " +
  "filter float format frozenset getattr globals hasattr hash help hex id input int isinstance issubclass " +
  "iter len list locals map max memoryview min next object oct open ord pow print property quit range repr " +
  "reversed round set setattr slice sorted staticmethod str sum super tuple type vars zip").split(" "));

// Every name the code creates: assignment targets, for targets (including
// comprehensions), def names and parameters, classes, imports, 'as' names,
// lambda parameters, := targets and global/nonlocal declarations.
function boundNames(clean) {
  const names = new Set();
  const add = text => { for (const n of text.match(IDENT) || []) names.add(n); };
  for (const line of logicalLines(clean)) {
    const target = line.trim().match(/^([^=]*?)\s*(?:[-+*\/%&|^@]|\/\/|\*\*|<<|>>)?=(?!=)/);
    if (target) add(target[1]);
  }
  for (const m of clean.matchAll(/\bfor\s+(.+?)\s+in\b/gu)) add(m[1]);
  for (const m of clean.matchAll(/\bdef\s+([\p{L}_][\p{L}\p{N}_]*)\s*\(([^)]*)\)/gu)) {
    names.add(m[1]);
    for (const part of m[2].split(",")) add((part.match(/^\s*\**\s*([\p{L}_][\p{L}\p{N}_]*)/u) || ["", ""])[1]);
  }
  for (const m of clean.matchAll(/\bclass\s+([\p{L}_][\p{L}\p{N}_]*)/gu)) names.add(m[1]);
  for (const m of clean.matchAll(/\bimport\s+([^\n]+)/gu)) add(m[1]);
  for (const m of clean.matchAll(/\bas\s+([\p{L}_][\p{L}\p{N}_]*)/gu)) names.add(m[1]);
  for (const m of clean.matchAll(/\blambda\b([^:]*):/gu)) add(m[1]);
  for (const m of clean.matchAll(/([\p{L}_][\p{L}\p{N}_]*)\s*:=/gu)) names.add(m[1]);
  for (const m of clean.matchAll(/\b(?:global|nonlocal)\s+([^\n]+)/gu)) add(m[1]);
  for (const line of logicalLines(clean)) {
    const pattern = line.trim().match(/^case\s+(.*):/);
    if (pattern) add(pattern[1]);
  }
  return names;
}

// print(Name) where Name is never created anywhere: usually forgotten quotes.
function unknownPrintedName(clean) {
  if (/\bimport\s*\*/.test(clean)) return null;
  const bound = boundNames(clean);
  for (const m of clean.matchAll(/(?:^|[^\p{L}\p{N}_.])print\s*\(\s*([\p{L}_][\p{L}\p{N}_]*)\s*\)/gu)) {
    const name = m[1];
    if (!bound.has(name) && !BUILTINS.has(name) && !/(Error|Exception|Warning)$/.test(name)) return name;
  }
  return null;
}

// True when an if statement sits inside an if/elif/else block, whatever the
// indent width (spaces or tabs).
function hasNestedIf(clean) {
  const width = s => s.replace(/\t/g, "        ").length;
  const stack = [];
  for (const line of logicalLines(clean)) {
    if (!line.trim()) continue;
    const indent = width(line.match(/^\s*/)[0]);
    while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();
    const kw = (line.trim().match(BLOCK_KEYWORD) || [])[1];
    if (kw === "if" && stack.some(b => ["if", "elif", "else"].includes(b.kw))) return true;
    if (kw && line.trimEnd().endsWith(":")) stack.push({ indent, kw });
  }
  return false;
}

const PRINT_CALL = /(^|[^\w.])print\s*\(/m;
const F_STRING = /(^|[^\w])[rRbB]?[fF][rR]?["']/m;

// Checks run in order; the first one that fires is shown to the kid.
// Each check gets (clean, scan) where scan also knows about unclosed strings.
export const COMMON_ERRORS = [
  { check: (clean, scan) => scan.openString, msg: "It looks like a string is missing its closing quote. Every \" needs a matching \" (and every ' a matching ')." },
  { check: clean => unclosedBracket(clean), msg: "It looks like a bracket is never closed. Every ( needs a matching ), every [ a ], and every { a }." },
  { check: clean => /(^|[^\w.])print[ \t]+[^\s(=]/m.test(clean), msg: "It looks like you forgot the parentheses after print. In Python 3, it's print(\"text\"), not print \"text\"." },
  { check: clean => assignmentInCondition(clean), msg: "Inside an if statement, use == (double equals) to compare values. Single = is for assigning variables." },
  { check: clean => missingColon(clean), msg: kw => BARE_KEYWORDS.includes(kw)
      ? `Don't forget the colon (:) after ${kw}!`
      : `Don't forget the colon (:) at the end of your ${kw} line!` },
  { check: clean => /print\(.*".*"\s*\+\s*\d/.test(clean) || /print\(.*\d\s*\+\s*".*"/.test(clean), msg: "You can't add strings and numbers directly. Use an f-string like f\"text {variable}\" or convert the number with str()." },
  { check: clean => unknownPrintedName(clean), msg: name => `${name} isn't a variable yet. If you meant the words ${name}, put them in quotes: print("${name}"). If it's a variable, create it with = before you print it.` },
];

export function validateOffline(code, challenge, attemptCount) {
  const trimmed = code.trim();
  const scan = scanCode(trimmed);
  const clean = scan.clean;
  const lines = clean.split('\n').filter(l => l.trim());

  // Empty code
  if (lines.length === 0) {
    return {
      output: "", error: null, passes: false,
      feedback: attemptCount > 1
        ? "Your code is empty or just comments. Try writing some Python! Start with what the task asks for."
        : "Nothing to run yet — write some code and click Run!"
    };
  }

  // Check common errors
  for (const err of COMMON_ERRORS) {
    const found = err.check(clean, scan);
    if (found) {
      const msg = typeof err.msg === "function" ? err.msg(found) : err.msg;
      return { output: "", error: msg, passes: false, feedback: "Fix this error and try again! You're getting closer." };
    }
  }

  // Challenge-specific validation using keywords and patterns
  const expected = (challenge.expectedBehavior || "").toLowerCase();
  const task = (challenge.task || "").toLowerCase();
  const prose = expected + " " + task;
  let score = 0;
  let maxScore = 0;
  const issues = [];
  const usesPrint = PRINT_CALL.test(clean);

  // Check for required keywords/constructs
  const checks = [];

  if (/\bprint/.test(expected)) {
    checks.push({ test: usesPrint, label: "use print()", weight: 3 });
  }
  if (/\bvariable|\bcreate/.test(expected)) {
    checks.push({ test: clean.includes("=") && !clean.match(/^[^=]*==[^=]*$/), label: "create a variable with =", weight: 2 });
  }
  if (/\b(no|not|without)\b[^.!\n]*f-strings?/.test(prose)) {
    checks.push({ test: !F_STRING.test(clean), label: "join the strings with + instead of using an f-string", weight: 3 });
    checks.push({ test: /[\p{L}\p{N}_"')\]]\s*\+\s*[\p{L}\p{N}_"'(]/u.test(clean), label: "join the strings with +", weight: 2 });
  } else if (/f-string|f"/.test(expected) || /f-string/.test(task)) {
    checks.push({ test: F_STRING.test(clean), label: "use an f-string (start with f before the quotes)", weight: 3 });
  }
  if (/\bif\b|\bconditional/.test(expected)) {
    checks.push({ test: /\bif\b/.test(clean), label: "use an if statement", weight: 3 });
  }
  if (/\belif\b/.test(expected)) {
    checks.push({ test: /\belif\b/.test(clean), label: "use elif for additional conditions", weight: 2 });
  }
  if (/\belse\b/.test(expected)) {
    checks.push({ test: /\belse\b/.test(clean), label: "include an else clause", weight: 2 });
  }
  if (expected.includes(".upper()")) {
    checks.push({ test: clean.includes(".upper()"), label: "use .upper()", weight: 2 });
  }
  if (expected.includes(".replace(")) {
    checks.push({ test: clean.includes(".replace("), label: "use .replace()", weight: 2 });
  }
  if (expected.includes("len(")) {
    checks.push({ test: clean.includes("len("), label: "use len()", weight: 2 });
  }
  if (expected.includes("type(")) {
    checks.push({ test: clean.includes("type("), label: "use type()", weight: 2 });
  }
  if (/\bor\b/.test(expected) && /\bcondition/.test(expected)) {
    checks.push({ test: /\bor\b/.test(clean), label: "use 'or' to combine conditions", weight: 2 });
  }
  if (/\band\b/.test(expected) && /\bcondition/.test(expected)) {
    checks.push({ test: /\band\b/.test(clean), label: "use 'and' to combine conditions", weight: 2 });
  }
  if (/\bnested\b(?!\s+(dict|list))/.test(expected)) {
    checks.push({ test: hasNestedIf(clean), label: "use nested if statements (indented inside another if)", weight: 3 });
  }

  // Constructs the task names. One the starter code already contains must be
  // kept, but earns no points, so the kid gets no credit for code they were given.
  const starter = stripCode((challenge.starterCode || "").trim());
  const requireConstruct = (prose, code, label, weight) => {
    if (!prose.test(expected)) return;
    checks.push(code.test(starter)
      ? { test: code.test(clean), label, weight: 0, required: true }
      : { test: code.test(clean), label, weight });
  };
  requireConstruct(/\bloops?\b|\blooping\b/, /\b(for|while)\b/, "use a loop (for or while)", 3);
  requireConstruct(/\bwhile\b/, /\bwhile\b/, "use a while loop", 2);
  requireConstruct(/\bcontinue\b/, /\bcontinue\b/, "use continue to skip ahead", 2);
  requireConstruct(/\bbreak\b/, /\bbreak\b/, "use break to stop the loop", 2);
  requireConstruct(/\bdefines?\b|\bfunctions?\b/, /\bdef\b/, "define a function with def", 3);
  requireConstruct(/\breturns?\b/, /\breturn\b/, "use return to send back a value", 2);
  requireConstruct(/\btry\s*\/\s*except\b|\btry-except\b|\bexcept\b/, /\btry\b[^]*\bexcept\b/, "use try and except", 3);
  requireConstruct(/\bdict(s|ionary|ionaries)?\b/, /\{|\bdict\(/, "use a dictionary", 2);
  requireConstruct(/\blists?\b/, /\[|\blist\(/, "use a list", 2);
  requireConstruct(/\bimport\b|\brandom\b|\bmodules?\b/, /\bimport\b/, "import the module you need", 2);
  requireConstruct(/\blambda\b/, /\blambda\b/, "use a lambda", 3);

  // Specific value checks from expected behavior
  const numMatches = expected.match(/(?:print|output|display|should be|gives? (?:you )?|= )(\d+(?:\.\d+)?)/g);
  if (numMatches) {
    for (const m of numMatches) {
      const num = m.match(/(\d+(?:\.\d+)?)/)[1];
      checks.push({ test: trimmed.includes(num) || lines.some(l => l.includes(num)), label: `produce the value ${num}`, weight: 1 });
    }
  }

  // Score
  let missingRequired = false;
  for (const c of checks) {
    maxScore += c.weight;
    if (c.test) score += c.weight;
    else { issues.push(c.label); if (c.required) missingRequired = true; }
  }

  // If no specific checks could be generated, be lenient
  if (maxScore === 0 && !missingRequired) {
    return {
      output: "(Output preview not available in Guide mode)",
      error: null,
      passes: usesPrint,
      feedback: usesPrint
        ? "Your code looks reasonable! In Guide mode I can't fully verify the output, but it looks like you're on the right track. Check that your output matches what the task asks for."
        : "Make sure you're using print() to display your results!"
    };
  }

  const pct = maxScore ? score / maxScore : 1;
  const passes = !missingRequired && pct >= 0.8 && issues.length <= 1;

  if (passes) {
    return {
      output: "(Output preview not available in Guide mode)",
      error: null, passes: true,
      feedback: "Great work! Your code has all the right pieces. You've got this! 🎉"
    };
  }

  // Progressive feedback based on attempt count
  let feedback;
  if (attemptCount <= 1) {
    feedback = issues.length > 0
      ? `Almost! Make sure you ${issues[0]}.`
      : "Not quite — re-read the task and check your code carefully.";
  } else if (attemptCount <= 3) {
    feedback = issues.length > 0
      ? `You're missing a few things. Try to: ${issues.slice(0, 2).join(" and ")}. You can do this!`
      : "Getting closer! Compare what you wrote to what the task is asking for, step by step.";
  } else {
    feedback = issues.length > 0
      ? `Here's exactly what's needed: ${issues.join(", ")}. Try the hints if you're stuck — they'll walk you through it!`
      : "Try using the hints — they'll give you a clearer picture of what the code should look like.";
  }

  return { output: "", error: null, passes: false, feedback };
}

// ═══════════════════════════════════════════════════════════════════
// NON-LLM CONCEPT EXPLAINER (for "Help" button in Guide mode)
// ═══════════════════════════════════════════════════════════════════

export const CONCEPT_HELP = {
  "print": [
    "print() is a function that makes Python display text on screen.",
    "You put your message INSIDE the parentheses, wrapped in quotes:\n  print(\"Hello!\")",
    "Single quotes work too:\n  print('Hello!')",
    "Each print() starts a new line automatically.",
  ],
  "variable": [
    "A variable is like a labeled box that stores information.",
    "Create one with the = sign:\n  name = \"Alex\"\n  age = 12",
    "The name goes on the LEFT, the value on the RIGHT.",
    "To see what's inside, use print():\n  print(name)  ← no quotes around the variable name!",
    "IMPORTANT: print(name) shows the VALUE inside the box. print(\"name\") shows the literal word 'name'.",
  ],
  "f-string": [
    "An f-string lets you mix variables into text.",
    "Start with f before the quotes:\n  f\"Hello {name}!\"",
    "Anything inside {curly braces} gets replaced with the variable's value.",
    "Example:\n  name = \"Alex\"\n  print(f\"Hi {name}!\")  →  Hi Alex!",
  ],
  "data-types": [
    "Python has different TYPES of data:",
    "STRING (str) = text, always in quotes:\n  \"hello\"  '42'  \"true\"",
    "INTEGER (int) = whole numbers:\n  42  -7  0  1000",
    "FLOAT = decimal numbers:\n  3.14  -0.5  100.0",
    "BOOLEAN (bool) = True or False\n  (Capitalized! true won't work)",
    "Check any value's type with type():\n  print(type(42))  →  <class 'int'>",
  ],
  "if-else": [
    "if/else lets your code make decisions.",
    "Structure:\n  if condition:\n      do_something()\n  else:\n      do_other_thing()",
    "The COLON (:) at the end of if/else is required!",
    "The INDENTATION (4 spaces) tells Python which code belongs to each branch.",
    "Conditions use comparisons:\n  == equal  != not equal\n  > greater  < less\n  >= greater or equal  <= less or equal",
  ],
  "elif": [
    "elif (short for 'else if') adds more branches:",
    "  if x > 90:\n      print(\"A\")\n  elif x > 80:\n      print(\"B\")\n  elif x > 70:\n      print(\"C\")\n  else:\n      print(\"F\")",
    "Python checks from TOP to BOTTOM and runs the FIRST match.",
    "else is the catch-all — it runs if nothing above matched.",
  ],
  "logic": [
    "Combine conditions with and, or, not:",
    "AND — both must be true:\n  if age >= 13 and has_ticket:\n      print(\"Enter!\")",
    "OR — at least one must be true:\n  if is_member or has_pass:\n      print(\"Welcome!\")",
    "NOT — flips true to false:\n  if not is_locked:\n      print(\"Open!\")",
  ],
  "math": [
    "Python math operators:",
    "  +  add        10 + 3 = 13\n  -  subtract   10 - 3 = 7\n  *  multiply   10 * 3 = 30\n  /  divide     10 / 3 = 3.333...\n  // int divide  10 // 3 = 3\n  ** power      2 ** 3 = 8\n  %  remainder  10 % 3 = 1",
    "/ always gives a float. // drops the decimal.",
    "** means 'to the power of' — 2**3 = 2×2×2 = 8",
  ],
  "strings": [
    "String methods — special actions for text:",
    "  .upper()    → ALL CAPS\n  .lower()    → all lowercase\n  .replace(old, new) → swap text\n  len(text)   → count characters",
    "Call methods with a DOT:\n  message = \"hello\"\n  print(message.upper())  →  HELLO",
  ],
};

export function getConceptsForChallenge(challenge) {
  const expected = ((challenge.expectedBehavior||"") + " " + (challenge.task||"")).toLowerCase();
  const concepts = [];
  if (expected.includes("print")) concepts.push("print");
  if (expected.includes("variable") || expected.includes("create")) concepts.push("variable");
  if (expected.includes("f-string") || expected.includes('f"') || expected.includes("f'")) concepts.push("f-string");
  if (expected.includes("type(") || expected.includes("data type") || expected.includes("str") || expected.includes("int") || expected.includes("float")) concepts.push("data-types");
  if (expected.includes("if") || expected.includes("conditional")) concepts.push("if-else");
  if (expected.includes("elif")) concepts.push("elif");
  if (expected.includes(" or ") || expected.includes(" and ") || expected.includes("not ")) concepts.push("logic");
  if (expected.includes("math") || expected.includes("*") || expected.includes("//") || expected.includes("**")) concepts.push("math");
  if (expected.includes("upper") || expected.includes("replace") || expected.includes("len(") || expected.includes("string method")) concepts.push("strings");
  if (concepts.length === 0) concepts.push("print", "variable");
  return concepts;
}
