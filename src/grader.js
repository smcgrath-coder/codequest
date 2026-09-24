// ═══════════════════════════════════════════════════════════════════
// NON-LLM VALIDATION ENGINE (Built-in Guide mode)
// ═══════════════════════════════════════════════════════════════════

export const COMMON_ERRORS = [
  { pattern: /print\s+[^(]/, msg: "It looks like you forgot the parentheses after print. In Python 3, it's print(\"text\"), not print \"text\"." },
  { pattern: /print\([^"'][a-zA-Z]/, check: (code, ch) => {
    // Only flag if it looks like they're printing an undefined variable
    if (code.match(/print\(\s*[a-zA-Z_]+\s*\)/) && !code.match(/\w+\s*=/)) return true;
    return false;
  }, msg: "Are you trying to print a variable? Make sure you've created the variable first with = before printing it." },
  { pattern: /[^=!<>]=[^=]/, check: (code) => {
    // Check for = where == was probably meant inside an if
    const ifLines = code.split('\n').filter(l => l.trim().startsWith('if') || l.trim().startsWith('elif'));
    return ifLines.some(l => l.match(/[^=!<>]=[^=]/) && !l.includes('==') && !l.includes('!=') && !l.includes('<=') && !l.includes('>='));
  }, msg: "Inside an if statement, use == (double equals) to compare values. Single = is for assigning variables." },
  { pattern: /if.*[^:]$/, check: (code) => code.split('\n').some(l => (l.trim().startsWith('if ')||l.trim().startsWith('elif ')) && !l.trim().endsWith(':')), msg: "Don't forget the colon (:) at the end of your if/elif/else line!" },
  { pattern: /else[^:]/, check: (code) => code.split('\n').some(l => l.trim().startsWith('else') && !l.trim().endsWith(':')), msg: "Don't forget the colon (:) after else!" },
  { pattern: /print\(.*\+.*\)/, check: (code) => {
    // Check for type mismatch in concatenation
    return code.match(/print\(.*".*"\s*\+\s*\d/) || code.match(/print\(.*\d\s*\+\s*".*"/);
  }, msg: "You can't add strings and numbers directly. Use an f-string like f\"text {variable}\" or convert the number with str()." },
];

export function validateOffline(code, challenge, attemptCount) {
  const trimmed = code.trim();
  const lines = trimmed.split('\n').filter(l => l.trim() && !l.trim().startsWith('#'));

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
    if (err.check) {
      if (err.check(trimmed, challenge)) return { output: "", error: err.msg, passes: false, feedback: "Fix this error and try again! You're getting closer." };
    } else if (trimmed.match(err.pattern)) {
      return { output: "", error: err.msg, passes: false, feedback: "Fix this error and try again!" };
    }
  }

  // Challenge-specific validation using keywords and patterns
  const expected = (challenge.expectedBehavior || "").toLowerCase();
  const task = (challenge.task || "").toLowerCase();
  let score = 0;
  let maxScore = 0;
  const issues = [];

  // Check for required keywords/constructs
  const checks = [];

  if (expected.includes("print")) {
    checks.push({ test: trimmed.includes("print("), label: "use print()", weight: 3 });
  }
  if (expected.includes("variable") || expected.includes("create") || expected.includes("must create")) {
    checks.push({ test: trimmed.includes("=") && !trimmed.match(/^[^=]*==[^=]*$/), label: "create a variable with =", weight: 2 });
  }
  if (expected.includes("f-string") || expected.includes("f\"") || task.includes("f-string")) {
    checks.push({ test: trimmed.includes('f"') || trimmed.includes("f'"), label: "use an f-string (start with f before the quotes)", weight: 3 });
  }
  if (expected.includes("if") || expected.includes("conditional")) {
    checks.push({ test: trimmed.includes("if "), label: "use an if statement", weight: 3 });
  }
  if (expected.includes("elif")) {
    checks.push({ test: trimmed.includes("elif "), label: "use elif for additional conditions", weight: 2 });
  }
  if (expected.includes("else")) {
    checks.push({ test: trimmed.includes("else"), label: "include an else clause", weight: 2 });
  }
  if (expected.includes(".upper()")) {
    checks.push({ test: trimmed.includes(".upper()"), label: "use .upper()", weight: 2 });
  }
  if (expected.includes(".replace(")) {
    checks.push({ test: trimmed.includes(".replace("), label: "use .replace()", weight: 2 });
  }
  if (expected.includes("len(")) {
    checks.push({ test: trimmed.includes("len("), label: "use len()", weight: 2 });
  }
  if (expected.includes("type(")) {
    checks.push({ test: trimmed.includes("type("), label: "use type()", weight: 2 });
  }
  if (expected.includes("or") && expected.includes("condition")) {
    checks.push({ test: trimmed.includes(" or "), label: "use 'or' to combine conditions", weight: 2 });
  }
  if (expected.includes("and") && expected.includes("condition")) {
    checks.push({ test: trimmed.includes(" and "), label: "use 'and' to combine conditions", weight: 2 });
  }
  if (expected.includes("nested")) {
    const indentLevels = lines.map(l => l.match(/^(\s*)/)[1].length);
    const hasNesting = indentLevels.some(l => l >= 8);
    checks.push({ test: hasNesting, label: "use nested if statements (indented inside another if)", weight: 3 });
  }

  // Specific value checks from expected behavior
  const numMatches = expected.match(/(?:print|output|display|should be|gives? (?:you )?|= )(\d+(?:\.\d+)?)/g);
  if (numMatches) {
    for (const m of numMatches) {
      const num = m.match(/(\d+(?:\.\d+)?)/)[1];
      checks.push({ test: trimmed.includes(num) || lines.some(l => l.includes(num)), label: `produce the value ${num}`, weight: 1 });
    }
  }

  // Score
  for (const c of checks) {
    maxScore += c.weight;
    if (c.test) score += c.weight;
    else issues.push(c.label);
  }

  // If no specific checks could be generated, be lenient
  if (maxScore === 0) {
    return {
      output: "(Output preview not available in Guide mode)",
      error: null,
      passes: lines.length >= 1 && trimmed.includes("print("),
      feedback: trimmed.includes("print(")
        ? "Your code looks reasonable! In Guide mode I can't fully verify the output, but it looks like you're on the right track. Check that your output matches what the task asks for."
        : "Make sure you're using print() to display your results!"
    };
  }

  const pct = score / maxScore;
  const passes = pct >= 0.8 && issues.length <= 1;

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
