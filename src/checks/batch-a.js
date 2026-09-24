// Grading rules for chapters 1-4 and practice grind_0-7 (ported from rules_a.py). Format: see src/checks.js.
// Hints are read by 9-12 year olds: one step to take, never the whole answer.
// Where rules_a.py built an expected-lines list with code (a comprehension or '-' * 20), the list is
// written out here. It passes the same programs, and grading.py only names the first wrong line
// ("so close!") for a literal lines([...]) check.
// The longer checks below are String.raw templates, so their Python reads exactly as grading.py sees it.

// grading.py's rerun() only replaces a top-level `name = ...` line, so it can't change a name set any other
// way, like `a, b = 15, 27`, and a rerun then looks like typed answers. For those programs a rule reads the
// code instead: every one of the names has to be used after it is set.
const unpacked = names => String.raw`(not all(any(isinstance(n, ast.Assign) and any(isinstance(t, ast.Name) and t.id == v for t in n.targets) for n in TREE.body) for v in ${JSON.stringify(names)}) and all(any(isinstance(n, ast.Name) and n.id == v and isinstance(n.ctx, ast.Load) for n in ast.walk(TREE)) for v in ${JSON.stringify(names)}))`;

// ch1_r5: some a + b (or a + b + ...) in the code has both a and b in it.
const ADDS_A_B = String.raw`any(isinstance(n, ast.BinOp) and isinstance(n.op, ast.Add) and {'a', 'b'} <= {m.id for m in ast.walk(n) if isinstance(m, ast.Name)} for n in ast.walk(TREE))`;

// grading.py's near miss says "so close! Check your capital letters and punctuation" when a line differs from W
// only in its spaces, which doesn't name the problem. This check runs before lines(W) and names the spaces instead.
const spacing = (W, hint) => ({ expr: `(lambda W: L == W or [''.join(l.split()) for l in L] != [''.join(w.split()) for w in W])(${JSON.stringify(W)})`, hint });

// ch3_r1 and ch3_s3: the True/False answers in R. On one line, every one counts (print(a > b, a < b, ...)); on
// several, the last one on each line does, so labels like "a > b: True" are fine and a line with none gives ''.
const BOOLS = String.raw`(lambda R: re.findall(r'\b(?:True|False)\b', R[0]) if len(R) == 1 else [(re.findall(r'\b(?:True|False)\b', l) or [''])[-1] for l in R])`;
// R holds n answers, each True or False. Checked before which ones they are, so each failure gets its own hint.
const nBools = (R, n) => `(lambda B: len(B) == ${n} and '' not in B)(${BOOLS}(${R}))`;

// ch3_s1: the last truthy or falsy word on each line of L, so labels like "0 is falsy" are fine.
const TRUTHY_WORDS = String.raw`[(re.findall(r'(?i)\b(?:truthy|falsy|falsey)\b', l) or [''])[-1].lower().replace('falsey', 'falsy') for l in L]`;

// grind_4: the letter grades in text t, each a capital A-F standing alone. When there's more than one, an A that
// starts a sentence and comes before a lowercase word ("A score of 73 gets a C") is the word "a", not a grade.
const GRADES = String.raw`(lambda t: (lambda g: g if len(g) < 2 else re.findall(r'\b[A-F]\b', re.sub(r'(?m)(^|[.!?]\s+)A(?=\s+[a-z])', r'\1', t)))(re.findall(r'\b[A-F]\b', t)))`;

// grind_5: what line l says about the year: -1 not a leap year, 1 a leap year, 0 neither. grading.py's polarity()
// reads "2023 is a regular year" or "Common year" as neither, and "isn’t" (with a curly ’) as a leap year.
const LEAP = String.raw`(lambda l: -1 if re.search(r"(?i)\b(?:not|no|nope|false|isnt|regular|common|normal|ordinary|non-leap)\b|n[’']t\b", l) else 1 if re.search(r'(?i)\b(?:leap|true|yes)\b', l) else 0)`;

// ch2_s1: PARITY(n) reads every place the number n is printed, up to the next of 15, 42 or 7 on that line,
// and says True if that place calls it even, False if odd, None if neither. The last even/odd word counts,
// flipped by a "not" just before it ("15 is not even") or a "no"/"false" after it ("Is 15 even? No"), so
// "Is 15 even? No, it is odd" reads as odd.
const PARITY = String.raw`(lambda n: [(lambda s, ms: None if not ms else (ms[-1].group(2).lower() == 'even') ^ bool(ms[-1].group(1)) ^ bool(re.search(r'(?i)\b(?:no|false)\b', s[ms[-1].end():])))(s, list(re.finditer(r"(?i)(\bnot\s+(?:an?\s+)?|n[’']t\s+(?:an?\s+)?|\bisnt\s+(?:an?\s+)?)?\b(even|odd)\b", s))) for s in re.findall(r'\b%d\b((?:(?!\b(?:15|42|7)\b)[^\n])*)' % n, out)])`;

// A % inside a loop, a function or a comprehension works on every number it is given.
const MOD_IN_LOOP = String.raw`any(isinstance(m, ast.BinOp) and isinstance(m.op, ast.Mod) for n in ast.walk(TREE) if isinstance(n, (ast.For, ast.While, ast.FunctionDef, ast.Lambda, ast.ListComp, ast.GeneratorExp)) for m in ast.walk(n))`;

// type() shown by Python itself: called at least once, never on a typed-in value, and no "<class" typed.
const REAL_TYPES = String.raw`calls('type') >= 1 and not any(isinstance(n, ast.Call) and isinstance(n.func, ast.Name) and n.func.id == 'type' and n.args and isinstance(n.args[0], ast.Constant) for n in ast.walk(TREE)) and not any('<class' in s for s in str_consts())`;

// ch3_s1: an if that tests the value itself (`if value:` or `if not value:`), with no == or other comparison.
const TRUTHY_IF = String.raw`(lambda n: isinstance(n, ast.If) and (not isinstance(n.test, (ast.Compare, ast.BoolOp, ast.UnaryOp)) or (isinstance(n.test, ast.UnaryOp) and isinstance(n.test.op, ast.Not) and not isinstance(n.test.operand, (ast.Compare, ast.BoolOp, ast.UnaryOp)))))`;

export const BATCH_A = {
  // ── Chapter 1: The Terminal ──
  ch1_r1: { output: [{ expr: "lines(['Hello, World!'])" }] },
  ch1_r2: { output: [{ expr: "lines(['I am a coder','I am brave','I am ready'])" }] },
  ch1_r3: {
    output: [{ expr: "lines(['Comments help me remember'])" }],
    // rules_a.py had len(new_comments()) >= 1, which a bare # (or # and spaces) passed: it needs words.
    concepts: [{ expr: "any(re.search('[A-Za-z]', c) for c in new_comments())", hint: "Add a comment of your own that starts with # and says what your program does (the one that was already there doesn't count)." }],
  },
  ch1_r4: {
    output: [{ expr: "L == [str(ns.get('hero_name'))]", hint: "Print the name that's stored in hero_name, with nothing else on the line." }],
    probes: [
      { expr: "isinstance(ns.get('hero_name'), str) and ns['hero_name'].strip() != ''", hint: "Make a variable called hero_name and put a name inside it, in quotes." },
      { expr: "rerun({'hero_name': \"'Zed'\"})[0] == ['Zed']", hint: "Print the hero_name variable, with no quotes around it, instead of typing the name." },
    ],
  },
  ch1_r5: {
    // rules_a.py wanted exactly 42, which failed print("The sum is", a + b). The task only says to print the sum,
    // so 42 printed anywhere is enough: print(a + b, "is the sum of", a, "and", b) and a line each for a, b and
    // the sum are fine too. The rerun below catches a typed 42.
    output: [{ expr: "nums([42])", hint: "Print the sum of a and b. If the answer looks strange, make sure a and b hold numbers, with no quotes around them." }],
    probes: [
      { expr: "ns.get('a') == 15 and ns.get('b') == 27", hint: "Make two number variables: a should be 15 and b should be 27." },
      // Reruns with 100 and 23, not rules_a.py's 1 and 2, since the sum now only has to appear somewhere and
      // 123 is less likely than 3 to turn up in a label. `a, b = 15, 27` can't be rerun (see unpacked above), so
      // there the code must add a and b themselves: a typed 15 + 27 passed when any + was enough.
      { expr: `nums([123], L=rerun({'a': '100', 'b': '23'})[0]) or (${unpacked(['a', 'b'])} and ${ADDS_A_B} and not any(isinstance(n, ast.Constant) and re.search(r'\\b42\\b', str(n.value)) for n in ast.walk(TREE)))`, hint: "Let Python do the adding: print a + b instead of typing the answer." },
    ],
  },
  ch1_r6: {
    output: [{ expr: "L == [f\"I love {ns.get('food')} so much!\"]", hint: "Print I love, then your food, then so much! on one line." }],
    concepts: [
      { expr: "fstrings() >= 1", hint: "This room is about f-strings. Put an f before the quotes and your variable in {curly braces}." },
      // Not in rules_a.py: print(f"I love", food, "so much!") is an f-string with no {}, and passed. So did
      // print(f"{sentence}") with the sentence glued together by +, so the {} must hold food itself (as in ch2_r4).
      { expr: "any(isinstance(n, ast.FormattedValue) and any(isinstance(m, ast.Name) and m.id == 'food' for m in ast.walk(n.value)) for n in ast.walk(TREE))", hint: "Put {food} inside the quotes of your f-string, so Python fills in the food for you." },
    ],
    probes: [
      { expr: "isinstance(ns.get('food'), str) and ns['food'].strip() != ''", hint: "Make a variable called food and put your favorite food inside it, in quotes." },
      { expr: "rerun({'food': \"'tacos'\"})[0] == ['I love tacos so much!']", hint: "Put {food} in your f-string instead of typing the food, so the sentence changes when food does." },
    ],
  },
  ch1_s1: {
    output: [
      spacing(['Roses are red', 'Violets are blue', 'Python is fun'], "So close! Some of your lines have an extra space. print() puts a space between the things you give it, so keep all the text in one string, with \\n where each new line starts."),
      { expr: "lines(['Roses are red','Violets are blue','Python is fun'])" },
    ],
    concepts: [
      { expr: "calls('print') == 1", hint: "Use just one print() this time, with \\n inside the text wherever a new line should start." },
      { expr: "not loop_calls('print')", hint: "Don't use a loop here: one print() with \\n inside the text can show all three lines." },
    ],
  },
  ch1_s2: {
    // The line built from greeting, or from "Hello": greeting = "Hello, " (the comma inside it) prints the line the
    // task shows, and so does greeting = "Hi" with a Hi, so both reach the probe below, whose hint names greeting.
    output: [{ expr: "L == [f\"{ns.get('greeting')}, {ns.get('name')}! Welcome to CodeQuest.\"] or L == [f\"Hello, {ns.get('name')}! Welcome to CodeQuest.\"]", hint: "Check the pieces you glue together: the comma, the spaces, the ! and the period at the end all have to be there." }],
    concepts: [
      { expr: "fstrings() == 0", hint: "No f-strings in this room: join the pieces with + instead." },
      { expr: "binop('Add') >= 1", hint: "Use the + sign to glue your strings together." },
    ],
    probes: [
      { expr: "ns.get('greeting') == 'Hello' and isinstance(ns.get('name'), str) and ns['name'].strip() != ''", hint: "Make greeting hold just \"Hello\", with no comma or space inside it, and make name hold any name you like." },
      { expr: "rerun({'name': \"'Zed'\"})[0] == ['Hello, Zed! Welcome to CodeQuest.']", hint: "Join your greeting and name variables with +, instead of typing the name into the text." },
    ],
  },
  ch1_s3: {
    // Split in three, so a kid who printed four numbers with one wrong is told that, not to print all four.
    output: [
      { expr: String.raw`len(re.findall(r'-?\d+(?:\.\d+)?', out)) >= 4`, hint: "Print all four values: days, hours, minutes and seconds." },
      { expr: "numset([3, 72, 4320, 259200])", hint: "One of your numbers isn't right yet. Remember: a day has 24 hours, an hour has 60 minutes and a minute has 60 seconds." },
      { expr: "nums([3, 72, 4320, 259200])", hint: "Print the four values in order: days, then hours, then minutes, then seconds." },
      { expr: "bool(re.search(r'(?i)h(ou)?r', out) and re.search(r'(?i)min', out) and re.search(r'(?i)sec', out))", hint: "Put a label next to each number, like hours, minutes or seconds, so we know what it means." },
    ],
    concepts: [
      { expr: "fstrings() >= 1", hint: "Print your results with an f-string: an f before the quotes and each variable in {curly braces}." },
      // Not in rules_a.py: print(f"Days:", days) and so on, with no {}, passed the f-string check.
      { expr: "count(ast.FormattedValue) >= 4", hint: "Put each of the four values inside {curly braces} in your f-strings, so Python fills them in." },
    ],
    probes: [{ expr: "nums([1, 24, 1440, 86400], L=rerun({'days': '1'})[0])", hint: "Work out hours from days, minutes from hours and seconds from minutes, so the whole chain changes when days does." }],
  },
  ch1_boss: {
    output: [{ expr: "len(L) == 1 and re.fullmatch(r'My name is (.+), I am (.+), and I love (.+)', L[0]) is not None", hint: "Print one sentence that follows the pattern exactly: My name is ___, I am ___, and I love ___" }],
    concepts: [
      { expr: "fstrings() >= 1", hint: "Use an f-string: an f before the quotes and your variables in {curly braces}." },
      // Not in rules_a.py: f"My name is Alex, ..." with the values typed in passed every other check,
      // because the probe only asks that each value is also stored in some variable. The {} must hold three
      // different variables of the kid's, or {name} twice (and game never used) passes too.
      { expr: "count(ast.FormattedValue) >= 3 and len({m.id for n in ast.walk(TREE) if isinstance(n, ast.FormattedValue) for m in ast.walk(n.value) if isinstance(m, ast.Name) and m.id in ns and not callable(ns[m.id])}) >= 3", hint: "Put each of your three variables inside its own {curly braces} in the f-string, instead of typing their values." },
    ],
    // With three {variables} already required, this mostly fails on extra text in a blank that the
    // output regex's (.+) let through, like "{age} years old" or "{game}!", so the hint names that.
    probes: [
      { expr: "all(any(str(v) == cap for k, v in ns.items() if not k.startswith('__')) for cap in re.fullmatch(r'My name is (.+), I am (.+), and I love (.+)', L[0]).groups())", hint: "Fill each ___ blank with just one variable in {curly braces}, and add no extra words or punctuation, not even at the end." },
      // Not in rules_a.py: the check above only asks that each blank holds some variable, so {game} in the name
      // blank and {name} in the game blank passed. Names are the kid's choice (my_name, favorite_game), so a blank is
      // out of place only when every variable holding its value is named after another blank and not its own.
      // A swap moves two, and needing two keeps one odd name (a gamertag for the name) from failing.
      { expr: String.raw`(lambda owners: sum(bool(owners(c)) and all(own not in n and any(k in n for k in ('name', 'age', 'game') if k != own) for n in owners(c)) for c, own in zip(re.fullmatch(r'My name is (.+), I am (.+), and I love (.+)', L[0]).groups(), ('name', 'age', 'game'))) < 2)(lambda c: [k.lower() for k, v in ns.items() if not k.startswith('__') and not callable(v) and str(v) == c])`, hint: "Check the order of your blanks: your name goes first, then your age, then your favorite game." },
    ],
  },
  grind_0: {
    output: [
      spacing(['####', '#  #', '#  #', '####'], "So close! Your # signs are right, but check the spaces in each row against the box in the task."),
      { expr: "lines(['####','#  #','#  #','####'])" },
    ],
  },
  grind_1: {
    output: [{ expr: "L == [f\"The {ns.get('animal')} ate {ns.get('number')} {ns.get('food')}s\"]", hint: "Print one line: The, your animal, ate, your number, then your food with an s on the end." }],
    probes: [
      { expr: "all(k in ns for k in ('animal', 'food', 'number'))", hint: "Make three variables called animal, food and number." },
      // Both reruns also accept `animal, food, number = ...` that uses all three (see unpacked above).
      { expr: `rerun({'animal': "'dog'"})[0][:1] and rerun({'animal': "'dog'"})[0][0].startswith('The dog ate') or ${unpacked(['animal', 'food', 'number'])}`, hint: "Use your variables in the sentence instead of typing the words, so it changes when they do." },
      // Not in rules_a.py: the rerun above only changes animal, so typing the food and number passed.
      // number goes in as text, so a program that joins it with + still works.
      { expr: `rerun({'animal': "'dog'", 'food': "'bone'", 'number': "'2'"})[0] == ['The dog ate 2 bones'] or ${unpacked(['animal', 'food', 'number'])}`, hint: "Use all three variables in the sentence, food and number too, instead of typing them." },
    ],
  },

  // ── Chapter 2: The Vault ──
  ch2_r1: {
    // rules_a.py wanted exactly three <class ...> lines. The task only says to print type() of each, so
    // labels ("word is <class 'str'>") and all three on one line are fine, as long as the order is right.
    output: [{ expr: "has(\"<class 'str'>\", \"<class 'int'>\", \"<class 'float'>\")", hint: "Print type() of word, then whole, then decimal, and check that each variable holds the right kind of value." }],
    probes: [
      { expr: "type(ns.get('word')) is str and type(ns.get('whole')) is int and type(ns.get('decimal')) is float", hint: "word should hold text in quotes, whole a whole number like 7, and decimal a number with a dot like 2.5." },
      // Not in rules_a.py: typing the three <class ...> lines by hand passed, since the values are free.
      { expr: "has(\"<class 'int'>\", \"<class 'float'>\", \"<class 'str'>\", L=rerun({'word': '7', 'whole': '2.5', 'decimal': \"'x'\"})[0])", hint: "Print type() of each of your variables, instead of typing what it says." },
    ],
  },
  ch2_r2: {
    // Split in two so a kid with six lines and one wrong answer is told that, not to print six lines.
    output: [
      { expr: "len(L) == 6", hint: "Print six lines, one answer on each, in the same order as the task." },
      // rules_a.py's nums_per_line takes any number on the line, so a label's numbers hid a wrong answer:
      // print("10 - 5 =", 5 - 10) prints 10 - 5 = -5. The answer is the last number on its line.
      { expr: String.raw`all((lambda f: bool(f) and abs(float(f[-1]) - v) <= 1e-6 * max(1, abs(v)))(re.findall(r'-?\d+(?:\.\d+)?', l)) for l, v in zip(L, [15, 5, 50, 10/3, 3, 16]))`, hint: "One of your six answers isn't right yet. Check that each line uses the same numbers and math symbol (+ - * / // or **) as the task, with the answer at the end of the line." },
    ],
    concepts: [{ expr: "all(binop(op) >= 1 for op in ('Add','Sub','Mult','Div','FloorDiv','Pow'))", hint: "Let Python do the math: write each calculation with + - * / // or ** instead of typing the answer." }],
  },
  ch2_r3: {
    // rules_a.py wanted the three results alone on their lines. The task shows no exact output, so a label
    // around each one ("Upper: THE VAULT AWAITS") is fine. Still a lines([...]) check, so a wrong line is named.
    output: [{ expr: String.raw`lines(['re:.*THE VAULT AWAITS.*', 're:.*the quest awaits.*', r're:.*\b16\b.*'])` }],
    probes: [{ expr: String.raw`lines(['re:.*A VAULT B.*', 're:.*a quest b.*', r're:.*\b9\b.*'], L=rerun({'message': "'a vault b'"})[0])`, hint: "Use .upper(), .replace() and len() on the message variable instead of typing the results." }],
  },
  ch2_r4: {
    output: [{ expr: "lines(['The code is 57'])" }],
    concepts: [
      { expr: "fstrings() >= 1", hint: "Print the answer with an f-string: an f before the quotes and the variable in {curly braces}." },
      { expr: "binop('FloorDiv') >= 1 and binop('Mult') >= 1", hint: "Type the whole calculation into your code, with * and //, and let Python work out the answer." },
      // Not in rules_a.py: f"The code is 57" (an f-string with the answer typed in) passed every check,
      // and so did f"The code is {57}", so the {} must hold the code variable.
      { expr: "any(isinstance(n, ast.FormattedValue) and any(isinstance(m, ast.Name) and m.id == 'code' for m in ast.walk(n.value)) for n in ast.walk(TREE))", hint: "Put the variable code inside {curly braces} in your f-string, so Python fills in the number for you." },
    ],
    probes: [{ expr: "ns.get('code') == 57", hint: "Store the answer in a variable called code, then print it." }],
  },
  ch2_r5: {
    output: [
      { expr: "nums([100, 10.0, 110.0])", hint: "Print subtotal, tax and total, in that order, and check that each one uses the formula from the task." },
      // rules_a.py wanted a letter on every line, which failed a receipt with a ---- divider or a blank
      // line, and a later version wanted 3 lines, which failed all three labeled values on one line. So:
      // find 100, 10 and 110 in order, and each needs a word right before or after it (between it and
      // its neighbours), which fails "Subtotal: 100 10.0 110.0". Decimals are rounded to 6 places first, so
      // total = subtotal * 1.1 (110.00000000000001) isn't told to add labels it has; the probe below names its formula.
      { expr: String.raw`(lambda m: bool(m) and all(re.search('[A-Za-z]', m.group(i) + m.group(i + 1)) for i in (1, 2, 3)))(re.search(r'^(.*?)(?<![\d.])100(?:\.0+)?(?![\d.])(.*?)(?<![\d.])10(?:\.0+)?(?![\d.])(.*?)(?<![\d.])110(?:\.0+)?(?![\d.])(.*)$', re.sub(r'\d+\.\d+', lambda f: ('%.6f' % float(f.group())).rstrip('0').rstrip('.'), out), re.S))`, hint: "Put a label next to each number, like Subtotal:, so the shopper knows what it is." },
    ],
    probes: [
      { expr: "ns.get('subtotal') == 100 and ns.get('tax') == 10.0 and ns.get('total') == 110.0", hint: "Make the variables subtotal, tax and total, using the formulas from the task." },
      // rules_a.py only changed price, so subtotal = price * 4 (quantity typed) passed. Both change here.
      { expr: "nums([30, 3.0, 33.0], L=rerun({'price': '10', 'quantity': '3'})[0])", hint: "Work out each value from price and quantity instead of typing the numbers, so the calculator works for any price and quantity." },
    ],
  },
  ch2_s1: {
    output: [
      // Swapped from rules_a.py so an even/odd mix-up gets this hint, not the generic one below.
      // rules_a.py matched `15 ... even` and `15 ... odd` with regexes, which misread "15 is not even" and
      // "Is 15 even? No, it is odd" as mix-ups, and failed them for having no "odd". PARITY (above) reads
      // what each place says instead. A number's place ends at the next of 15, 42 or 7 or at the end of the
      // line, so "15 is odd, 42 is even" on one line and a later "Even numbers are cool!" line are fine.
      { expr: `(lambda V: not (True in V(15) + V(7) or False in V(42)))(${PARITY})`, hint: "One of your numbers says the wrong thing: a number is even when number % 2 is 0." },
      { expr: `(lambda V: False in V(15) and True in V(42) and False in V(7))(${PARITY})`, hint: "For each number, print the number and the word even or odd." },
    ],
    // rules_a.py had binop('Mod') >= 1, which one stray print(15 % 2) passed with the answers typed.
    concepts: [{ expr: `binop('Mod') >= 3 or ${MOD_IN_LOOP}`, hint: "Use % 2 on each of the three numbers, so Python works out every answer." }],
  },
  ch2_s2: {
    output: [{ expr: "lines(['CodeCodeCode', 'C', 'e', '--------------------'])" }],
    probes: [{ expr: "rerun({'word': \"'Robot'\"})[0] == ['RobotRobotRobot', 'R', 't', '-' * 20]", hint: "Use word with *, [0] and [-1] instead of typing the letters, so it works for any word." }],
  },
  ch2_s3: {
    // rules_a.py wanted the two type lines alone. The task says to print them "to prove they're different", so a
    // label around each ("price_text is <class 'str'>") is fine. Still a lines([...]) check, so a wrong line is named.
    output: [{ expr: "lines(['3 items at $49 = $147', \"re:.*<class 'str'>.*\", \"re:.*<class 'int'>.*\"])" }],
    // Not in rules_a.py: the two type lines typed by hand, or type("49") and type(147), passed.
    concepts: [{ expr: REAL_TYPES, hint: "Print type(price_text) and type(total), so Python shows each variable's type, instead of typing it." }],
    probes: [
      { expr: "type(ns.get('total')) is int and ns['total'] == 147", hint: "Store your answer in a variable called total, and make it a whole number by using int() on price_text." },
      { expr: "'$30' in '\\n'.join(rerun({'price_text': \"'10'\"})[0])", hint: "Work out total from price_text instead of typing the answer, so it works for any price." },
    ],
  },
  ch2_boss: {
    output: [{ expr: "'power' in out.lower()", hint: "Your report needs a Power Rating: attack plus defense." }],
    probes: [
      { expr: "isinstance(ns.get('name'), str) and type(ns.get('level')) is int and type(ns.get('health')) is float", hint: "Make name some text in quotes, level a whole number, and health a number with a dot, like 100.0." },
      { expr: "ns.get('attack') == ns['level'] * 3.5 and ns.get('defense') == ns['level'] * 2 + 10", hint: "Work out attack and defense from level, using the formulas in the task." },
      // Split from rules_a.py's one check, so a printed but wrong Power Rating is told what power is.
      { expr: "str(ns['name']) in out and numset([ns['level'], ns['health'], ns['attack'], ns['defense']])", hint: "Print every stat in your report: name, level, health, attack and defense." },
      { expr: "numset([ns['attack'] + ns['defense']])", hint: "Your Power Rating should be attack + defense, so check that your report adds those two." },
      // rules_a.py only changed level, so a report that typed the name, level and health passed: the typed
      // "Level: 5" still showed a 5, and only attack, defense and power were looked for. All three change here.
      // health is a whole number, so a report that rounds it (:.0f) still shows it.
      { expr: String.raw`(lambda R: 'Qwerty' in '\n'.join(R) and numset([2, 42.0, 7.0, 14, 21.0], L=R))(rerun({'name': "'Qwerty'", 'level': '2', 'health': '42.0'})[0])`, hint: "Use your variables for every stat in the report, name, level and health too, instead of typing them, so the report changes when they do." },
    ],
  },
  grind_2: {
    output: [{ expr: "has('42', \"<class 'int'>\", '3.14', \"<class 'float'>\", '100', \"<class 'str'>\")", hint: "Print each converted value followed by its type(), in the order from the task." }],
    concepts: [
      { expr: "calls('int') >= 1 and calls('float') >= 1 and calls('str') >= 1", hint: "Do the converting with int(), float() and str()." },
      // Not in rules_a.py: converting, then typing "<class 'int'>" and the others as text, passed.
      { expr: REAL_TYPES, hint: "Show each value's type with type(), instead of typing <class ...> yourself." },
    ],
  },
  grind_3: {
    // The task doesn't ask for one per line, so all four on one line passes too.
    // Split in two, so four lines with a wrong remainder are told that, not how to lay the lines out.
    output: [
      { expr: String.raw`len(L) == 4 or (len(L) == 1 and len(re.findall(r'-?\d+(?:\.\d+)?', L[0])) >= 4)`, hint: "Print the remainder for 2, 3, 5 and 7, in that order, one on each line." },
      { expr: "nums_per_line([1, 1, 2, 6]) or (len(L) == 1 and nums([1, 1, 2, 6]))", hint: "One of your remainders isn't right yet. Check that each line uses 97, the % sign and the right number: 2, then 3, then 5, then 7." },
    ],
    // rules_a.py had binop('Mod') >= 1, which one print(97 % 2) passed with the other three typed.
    concepts: [{ expr: `binop('Mod') >= 4 or ${MOD_IN_LOOP}`, hint: "Let Python find each of the four remainders with the % operator." }],
  },

  // ── Chapter 3: The Crossroads ──
  ch3_r1: {
    // rules_a.py wanted the bare True/False lines. Labels like "a > b: True" are fine too, and so are all five
    // on one line, as the task lists them (see BOOLS above).
    output: [
      { expr: nBools('L', 5), hint: "Print each of the five comparisons from the task, in order, and leave the quotes off so Python prints True or False." },
      { expr: `${BOOLS}(L) == ['True', 'False', 'True', 'True', 'True']`, hint: "One of your answers isn't right yet. Check that each comparison uses the same letters, numbers and signs as the task." },
    ],
    // rules_a.py only reran with a = 3, which kept answers 4 and 5 True and never changed b, so print(5 >= 5),
    // print(10 != b) or a typed print(True) passed. Every way of typing 10 for a, 5 for b, or True/False in
    // one answer gives a different answer in at least one of the last two runs (checked by brute force).
    probes: [{ expr: `all(${BOOLS}(rerun({'a': a, 'b': b})[0]) == want for a, b, want in [('3', '5', ['False', 'True', 'False', 'True', 'True']), ('3', '3', ['False', 'False', 'False', 'False', 'False']), ('7', '9', ['False', 'True', 'False', 'True', 'True'])])`, hint: "Print each comparison itself, using a and b, instead of typing True or False." }],
  },
  ch3_r2: {
    output: [{ expr: "lines(['You passed!', 'Try again!'])" }],
    probes: [
      { expr: "rerun({'score': '50'})[0] == ['Try again!', 'Try again!']", hint: "Use an if/else that checks score, instead of typing the answers." },
      { expr: "rerun({'score#2': '90'})[0] == ['You passed!', 'You passed!']", hint: "Do the same if/else check again after score = 50, instead of typing the answer." },
      // rules_a.py only tried 70 here, so `score > 50` or `score >= 60` passed; 69 must not pass.
      { expr: "rerun({'score': '70'})[0][:1] == ['You passed!'] and rerun({'score': '69'})[0][:1] == ['Try again!']", hint: "Check your comparison: a score of 70 or more should pass, and anything under 70 should not." },
      // Not in rules_a.py: the second score was only tried at 50 and 90, so a second check of
      // `score <= 50` or `score == 50` passed.
      { expr: "rerun({'score#2': '70'})[0] == ['You passed!', 'You passed!'] and rerun({'score#2': '69'})[0] == ['You passed!', 'Try again!']", hint: "Make your second check the same as your first one, so it also passes 70 or more and says Try again! for anything less." },
    ],
  },
  ch3_r3: {
    output: [{ expr: "lines(['Warm'])" }],
    // rules_a.py never tried a temp in 80-89, 60-69 or 40-49, so thresholds like >= 80, >= 60 or >= 40 passed;
    // 89, 69 and 49 (just under each edge) catch them.
    probes: [{ expr: "all(rerun({'temp': t})[0] == [w] for t, w in [('95','Hot'), ('90','Hot'), ('89','Warm'), ('70','Warm'), ('69','Cool'), ('55','Cool'), ('50','Cool'), ('49','Cold'), ('30','Cold')])", hint: "Use if/elif/else on temp, with the same numbers and >= signs as the task, so every temperature lands in the right group." }],
  },
  ch3_r4: {
    output: [{ expr: "lines(['Access granted'])" }],
    concepts: [{ expr: "boolop('or')", hint: "Join your two checks with or, so either one can open the gate." }],
    // rules_a.py's one check here told `age >= 12 or has_permission` and `or "has_permission"` (always true)
    // to use if/else, which they did. Split so a wrong test and a missing else get their own hints.
    probes: [
      { expr: "'Access granted' not in rerun({'has_permission': 'False'})[0]", hint: "With has_permission set to False, a 12-year-old shouldn't get in. Check your age test, and use has_permission itself, with no quotes around it." },
      { expr: "rerun({'has_permission': 'False'})[0] == ['Access denied']", hint: "Add an else that prints Access denied, written just like the task, for when neither check is true." },
      // rules_a.py only tried 15, so `age > 13` or `age >= 14` passed; 13 itself must get in.
      { expr: "all(rerun({'has_permission': 'False', 'age': a})[0] == ['Access granted'] for a in ('13', '15'))", hint: "Anyone 13 or older should get in even without permission, so check your age test: 13 itself counts." },
    ],
  },
  ch3_r5: {
    output: [{ expr: "lines(['Easy win!'])" }],
    // nested_if() alone missed `if not has_sword: ... else:` with the if/else inside the else, because in the
    // ast that looks just like an elif. Only the column tells them apart: an elif starts where its if does.
    concepts: [{ expr: "nested_if() or any(isinstance(n, ast.If) and len(n.orelse) == 1 and isinstance(n.orelse[0], ast.If) and n.orelse[0].col_offset > n.col_offset for n in ast.walk(TREE))", hint: "Put an if/else inside another if, so the monster check only happens when you have a sword." }],
    probes: [
      { expr: "rerun({'monster_health': '80'})[0] == ['Tough fight!']", hint: "Check monster_health with an if, so a strong monster gives a tough fight." },
      // Not in rules_a.py: 50 was never tried, so `monster_health >= 50` passed.
      { expr: "rerun({'monster_health': '51'})[0] == ['Tough fight!'] and rerun({'monster_health': '50'})[0] == ['Easy win!']", hint: "Check your comparison: only a monster with more than 50 health is a tough fight, so 50 itself is an easy win." },
      // Split from rules_a.py's one check, so a message typo ("You need a sword!") isn't told to check has_sword.
      { expr: "not any(m in rerun({'has_sword': 'False'})[0] for m in ('Easy win!', 'Tough fight!'))", hint: "Check has_sword first, so a hero without a sword doesn't fight the monster at all." },
      { expr: "rerun({'has_sword': 'False'})[0] == ['You need a weapon!']", hint: "When has_sword is False, print You need a weapon! in your else, written just like the task." },
    ],
  },
  ch3_s1: {
    // rules_a.py wanted the bare words. print(value, "is falsy") is fine too, so each line's last truthy or falsy
    // counts (see TRUTHY_WORDS above).
    output: [
      { expr: `len(L) == 5 and '' not in ${TRUTHY_WORDS}`, hint: "Print one line for each of the five values, in the same order as the list, with the word truthy or falsy on it." },
      { expr: `${TRUTHY_WORDS} == ['falsy', 'falsy', 'truthy', 'truthy', 'falsy']`, hint: "One of your values has the wrong answer. Test each value all by itself, with if value:, and let Python decide." },
    ],
    concepts: [
      // rules_a.py refused every UnaryOp, which failed `if not value:`; a `not` in front of the bare value is fine.
      { expr: `any(map(${TRUTHY_IF}, ast.walk(TREE)))`, hint: "Test the value all by itself, with if value:, and no == or other comparison." },
      // Not in rules_a.py: one `if 0:` with the other four answers typed passed. The task asks to test
      // every value, so there must be five such ifs, or one in a loop or a function.
      { expr: `(lambda ok: sum(map(ok, ast.walk(TREE))) >= 5 or any(ok(m) for n in ast.walk(TREE) if isinstance(n, (ast.For, ast.While, ast.FunctionDef)) for m in ast.walk(n)))(${TRUTHY_IF})`, hint: "Test all five values with if/else, not just one: use a loop, or one if/else for each value." },
    ],
  },
  ch3_s2: {
    output: [{ expr: "lines(['minor', 'boiling', 'game over'])" }],
    concepts: [{ expr: "count(ast.IfExp) >= 3", hint: "Use the inline form for all three, like print(\"yes\" if test else \"no\")." }],
    probes: [
      { expr: "rerun({'age': '20', 'temp': '50', 'lives': '3'})[0] == ['adult', 'not yet', 'keep going']", hint: "Base each answer on age, temp and lives, instead of typing the words." },
      // Not in rules_a.py: no test sat on an edge, so `age > 18` (or temp == 100, or lives != 3) passed.
      { expr: "rerun({'age': '18', 'temp': '150', 'lives': '1'})[0] == ['adult', 'boiling', 'keep going'] and rerun({'age': '17', 'temp': '99'})[0][:2] == ['minor', 'not yet']", hint: "Check each test against the task: 18 or older is an adult, and 100 or more is boiling." },
    ],
  },
  ch3_s3: {
    // rules_a.py wanted the bare True/False lines. The task words each check as a question, so a label like
    // "Is x between 1 and 50? True" is fine, as in ch3_r1 (see BOOLS above).
    output: [
      { expr: nBools('L', 3), hint: "Print the three chained comparisons from the task, one on each line, and leave the quotes off so Python prints True or False." },
      { expr: `${BOOLS}(L) == ['True', 'False', 'True']`, hint: "One of your answers isn't right yet. Check the numbers and signs in each chained comparison against the task." },
    ],
    concepts: [{ expr: "chained() >= 3", hint: "Write each check as one chained comparison with x in the middle, like 0 < x < 99." }],
    probes: [
      { expr: `${BOOLS}(rerun({'x': '40'})[0]) == ['True', 'True', 'True']`, hint: "Compare x itself in each line, instead of typing True or False." },
      // rules_a.py only tried x = 5 here, so no upper end was ever tested: 30 <= x <= 50 on line 2, or
      // 10 < x < 100 on line 3, passed. 75, 150 and 0 test the other ends; the edges themselves aren't
      // tried, since "between 1 and 50" can mean < or <=.
      { expr: `all(${BOOLS}(rerun({'x': v})[0]) == w for v, w in [('5', ['True', 'False', 'False']), ('75', ['False', 'True', 'False']), ('150', ['False', 'False', 'False']), ('0', ['False', 'False', 'False'])])`, hint: "Check the numbers in each chained comparison, the low end and the high end, against the range from the task." },
    ],
  },
  ch3_boss: {
    // Split from rules_a.py's one check, so "Great Job!" is told about the message's spelling, not to print it.
    output: [
      { expr: String.raw`re.search(r'\bB\b', out) is not None`, hint: "A score of 87 is a B. Print the letter grade, and check the numbers in your if and elif tests." },
      { expr: "'Great job!' in out", hint: "Print B's message too, written exactly as the task shows it, with the same capital letters and punctuation." },
      { expr: "not any(m in out for m in ['Excellent!', 'Not bad!', 'Needs work', 'Try harder!'])", hint: "Print only B's message: use elif and else, so only the first test that matches prints." },
    ],
    // rules_a.py tried 95/90/75/65/40, so > 80, > 70, > 60 or >= 50 passed. Now every edge (90, 80, 70, 60)
    // and the score just under it is tried, each run once, and only the right band's message may show.
    probes: [{ expr: "all((lambda t: re.search(r'\\b%s\\b' % g, t) and m in t and sum(x in t for x in ('Excellent!', 'Great job!', 'Not bad!', 'Needs work', 'Try harder!')) == 1)('\\n'.join(rerun({'score': s})[0])) for s, g, m in [('95','A','Excellent!'), ('90','A','Excellent!'), ('89','B','Great job!'), ('80','B','Great job!'), ('79','C','Not bad!'), ('75','C','Not bad!'), ('70','C','Not bad!'), ('69','D','Needs work'), ('65','D','Needs work'), ('60','D','Needs work'), ('59','F','Try harder!'), ('40','F','Try harder!')])", hint: "Pick the grade with if/elif/else on score, and check each edge: exactly 90 is an A, 80 a B, 70 a C and 60 a D." }],
  },
  grind_4: {
    // rules_a.py's \b[A-F]\b also counted the word "A" in "A score of 73 gets a C" (see GRADES above). Split in
    // two, so a wrong letter and a second letter (separate ifs, not elif) each get their own hint.
    output: [
      { expr: `'C' in ${GRADES}(out)`, hint: "A score of 73 should get a C. Check the numbers and signs in your if and elif tests." },
      { expr: `${GRADES}(out) == ['C']`, hint: "Print just one letter grade: use elif and else, so only the first test that matches prints." },
    ],
    // rules_a.py never tried 70 or 60 (and the hint named only 90 and 80), so > 70 or > 60 passed.
    probes: [{ expr: `all(${GRADES}('\\n'.join(rerun({'score': s})[0])) == [g] for s, g in [('95','A'), ('90','A'), ('89','B'), ('85','B'), ('80','B'), ('79','C'), ('70','C'), ('69','D'), ('65','D'), ('60','D'), ('59','F'), ('10','F')])`, hint: "Pick the letter with if/elif/else on score, and check each edge: exactly 90 is an A, 80 a B, 70 a C and 60 a D." }],
  },
  grind_5: {
    // rules_a.py wanted exactly one line with a yes/no meaning, which failed a title like "Leap Year Checker"
    // (polarity reads "leap year" as yes). The last such line is the answer.
    // LEAP (above) reads each line, not grading.py's polarity(), so "2023 is a regular year" or "Common year" is a no.
    output: [{ expr: `[p for p in map(${LEAP}, L) if p][-1:] == [1]`, hint: "2024 is a leap year, so your program should print a line that says it is one. If yours says it isn't, check your rule." }],
    // rules_a.py tried only 1900, 2000 and 2023, and its hint named 1900 and 2000, so special-casing
    // `year == 1900` passed. 2100 and 2400 aren't named anywhere.
    probes: [{ expr: `all([p for p in map(${LEAP}, rerun({'year': y})[0]) if p][-1:] == [want] for y, want in [('1900', -1), ('2000', 1), ('2023', -1), ('2100', -1), ('2400', 1)])`, hint: "Use every part of the rule from the task, with % and the words and/or, so your program is right for any year, not just 2024." }],
  },

  // ── Chapter 4: The Loop Tower ──
  ch4_r1: {
    output: [{ expr: "lines(['Step 0', 'Step 1', 'Step 2', 'Step 3', 'Step 4'])" }],
    concepts: [{ expr: "count(ast.For) >= 1", hint: "Use a for loop with range() to print the steps." }],
  },
  ch4_r2: {
    output: [{ expr: "lines(['2','4','6','8','10','5','4','3','2','1'])" }],
    concepts: [
      { expr: "count(ast.For) >= 2", hint: "Use two for loops: one for the even numbers and one for the countdown." },
      // rules_a.py counted any 3-argument range, so range(1, 6, 1) with print(i * 2) passed; a step of 1
      // isn't the counting the task asks range() to do.
      { expr: "sum(isinstance(n, ast.Call) and isinstance(n.func, ast.Name) and n.func.id == 'range' and len(n.args) == 3 and not (isinstance(n.args[2], ast.Constant) and n.args[2].value == 1) for n in ast.walk(TREE)) >= 2", hint: "Let range() do the counting both times: give it a start, a stop and a step, like the task shows." },
    ],
  },
  ch4_r3: {
    // The letter match is (?i) too, like the kind match (rules_a.py's wasn't), so char.upper() is fine. Split in
    // two, so six lines with a letter labeled wrong (char in "AEIOU") are told that, not how to lay the lines out.
    output: [
      { expr: "len(L) == 6 and all(re.search(r'(?i)\\b%s\\b' % ch, l) and re.search(r'(?i)vowel|consonant', l) for l, ch in zip(L, 'python'))", hint: "Print one line for each letter, with the letter and the word vowel or consonant." },
      { expr: "all(re.search(r'(?i)%s' % kind, l) for l, kind in zip(L, ['consonant', 'consonant', 'consonant', 'consonant', 'vowel', 'consonant']))", hint: "One of your letters has the wrong label. Only a, e, i, o and u are vowels, so check the test in your if." },
    ],
    probes: [{ expr: "[('vowel' if 'vowel' in l.lower() else 'consonant' if 'consonant' in l.lower() else '?') for l in rerun({'word': \"'audio'\"})[0]] == ['vowel','vowel','consonant','vowel','vowel']", hint: "Inside the loop, use an if to decide whether each char is a vowel, instead of typing the answers." }],
  },
  ch4_r4: {
    output: [{ expr: "lines(['Energy: 10', 'Energy: 9', 'Energy: 8', 'Energy: 7', 'Energy: 6', 'Energy: 5', 'Energy: 4', 'Energy: 3', 'Energy: 2', 'Energy: 1', 'Energy: 0', 'Shutdown!'])" }],
    concepts: [
      { expr: "count(ast.While) >= 1", hint: "This room is about while loops, so count the energy down with while." },
      // Not in rules_a.py: `while energy > 0` with print("Energy: 0") typed after the loop passed, and no
      // rerun can catch it, because the typed line is always the last one. Every print that has "Energy"
      // in its text must be inside a while loop.
      { expr: String.raw`(lambda W: all(any(p is m for w in W for m in ast.walk(w)) for p in ast.walk(TREE) if isinstance(p, ast.Call) and isinstance(p.func, ast.Name) and p.func.id == 'print' and any(isinstance(c, ast.Constant) and isinstance(c.value, str) and 'energy' in c.value.lower() for c in ast.walk(p))))([n for n in ast.walk(TREE) if isinstance(n, ast.While)])`, hint: "Print every Energy line from inside your while loop, and let the loop itself count all the way down to 0." },
    ],
    probes: [{ expr: "rerun({'energy': '3'})[0] == ['Energy: 3', 'Energy: 2', 'Energy: 1', 'Energy: 0', 'Shutdown!']", hint: "Count down from the energy variable in your loop, instead of typing the numbers." }],
  },
  ch4_r5: {
    output: [{ expr: "lines(['1', '3', '5', '7'])" }],
    concepts: [
      { expr: "count(ast.Continue) >= 1", hint: "Use continue to skip the even numbers." },
      { expr: "count(ast.Break) >= 1", hint: "Use break to stop the loop at the number divisible by 7." },
    ],
  },
  ch4_s1: {
    output: [
      spacing(['*', '**', '***', '****', '*****'], "So close! Your rows have the right stars, but extra spaces too. Print the stars with no spaces before or between them."),
      { expr: "lines(['*', '**', '***', '****', '*****'])" },
    ],
    // rules_a.py's loop check was dropped as expectedBehavior only, so typing the triangle passed. The task's own
    // hint says the row number controls how many stars there are, so the rows mustn't be typed in: at most one
    // string of two or more stars (stars = "*****" to slice in a loop is fine). No loop is required.
    concepts: [{ expr: String.raw`sum(len(re.findall(r'\*{2,}', s)) for s in str_consts()) < 2`, hint: "Let the row number decide how many stars to print, instead of typing each row yourself." }],
  },
  ch4_s2: {
    // rules_a.py wanted the sum first; the task only says to print both results, in any order.
    output: [
      { expr: "nums([5050, 33]) or nums([33, 5050])", hint: "Print both answers: the total of all the numbers from 1 to 100, and how many of them divide evenly by 3. If one is wrong, check what your loop adds." },
      // Not in rules_a.py: a print indented into the loop shows 100 running totals, and the last one passed the
      // check above. The task asks for the two results, so a few lines with labels, not one per number.
      { expr: "len(L) <= 6", hint: "Print total and count just once, after the loop has finished: take the indent off your print() lines so they aren't inside the loop." },
    ],
    // Not in rules_a.py: `count = 33` (or total = 5050) typed after the loop passed, since the probe only
    // looks at the final values. A rerun with other starting values would catch it but would also fail
    // correct shortcuts like total = 100 * 101 // 2, so this looks for the answers typed into the code.
    concepts: [{ expr: String.raw`not any(isinstance(n, ast.Constant) and re.search(r'(?<![\d.])(?:5050|33)(?!\d)', str(n.value)) for n in ast.walk(TREE))`, hint: "Let your loop work out total and count, instead of typing the answers into your code." }],
    probes: [{ expr: "ns.get('total') == 5050 and ns.get('count') == 33", hint: "Inside the loop, add each number to total, and add 1 to count when the number divides by 3." }],
  },
  ch4_s3: {
    output: [{ expr: "lines(['Trying: java', 'Trying: ruby', 'Trying: python', 'Access granted!'])" }],
    concepts: [{ expr: "count(ast.Break) >= 1", hint: "Use break to stop the loop once the password is found." }],
    probes: [
      { expr: "rerun({'password': \"'ruby'\"})[0] == ['Trying: java', 'Trying: ruby', 'Access granted!']", hint: "Compare each guess to the password variable, so it still stops at the right guess if the password changes." },
      { expr: "rerun({'password': \"'java'\"})[0] == ['Trying: java', 'Access granted!']", hint: "Loop through guesses and stop as soon as one matches password." },
      // Not in rules_a.py: both reruns above have a password that is in the list, so printing
      // Access granted! after the loop, match or not, passed. Extra lines (like Access denied) are fine.
      { expr: "(lambda L: L[:4] == ['Trying: java', 'Trying: ruby', 'Trying: python', 'Trying: rust'] and 'Access granted!' not in L)(rerun({'password': \"'go'\"})[0])", hint: "Only print Access granted! when a guess matches the password, inside your if." },
    ],
  },
  ch4_boss: {
    output: [{ expr: "lines(['10', '9', '8', '6', '5', '4', '3', '2', '1', 'LIFTOFF!', 'Altitude: 100', 'Altitude: 200', 'Altitude: 300', 'Altitude: 400', 'Altitude: 500'])" }],
    concepts: [
      { expr: "count(ast.For, ast.While) >= 2", hint: "Use a loop for the countdown and another for the altitudes, instead of one print per line." },
      // Not in rules_a.py: `for i in [10, 9, 8, 6, 5, 4, 3, 2, 1]` passed "skip 7!" with nothing skipped.
      // Any way the code skips 7 (if i == 7, i != 7, range(10, 7, -1)) has a 7 in it. A dead `if i == 7` on that
      // typed list has one too, so a list, tuple or set typed with a 6 or an 8 (7's neighbours) but no 7 fails.
      // An altitude list like [1, 2, 3, 4, 5] or [100, 200, ...] has neither and is fine.
      { expr: "any(isinstance(n, ast.Constant) and n.value in (7, '7') for n in ast.walk(TREE)) and not any(isinstance(n, (ast.List, ast.Tuple, ast.Set)) and (lambda v: ('6' in v or '8' in v) and '7' not in v)({str(e.value) for e in n.elts if isinstance(e, ast.Constant)}) for n in ast.walk(TREE))", hint: "Make your countdown loop skip 7 with an if, instead of leaving 7 out of the numbers." },
    ],
  },
  grind_6: {
    output: [{ expr: "lines(['7 x 1 = 7', '7 x 2 = 14', '7 x 3 = 21', '7 x 4 = 28', '7 x 5 = 35', '7 x 6 = 42', '7 x 7 = 49', '7 x 8 = 56', '7 x 9 = 63', '7 x 10 = 70'])" }],
    // As for ch4_s1, the loop check was expectedBehavior only, and typing the table passed. Typed answers are
    // still easy to spot without asking for a loop: none of 14, 21, ..., 63 is in a correct program's code
    // (7 and 70 can be, as in range(7, 70 + 1, 7)).
    concepts: [{ expr: String.raw`not any(isinstance(n, ast.Constant) and set(re.findall(r'\d+', str(n.value))) & {'14', '21', '28', '35', '42', '49', '56', '63'} for n in ast.walk(TREE))`, hint: "Let Python work out each answer with *, instead of typing the answers in." }],
  },
  grind_7: {
    output: [{ expr: "lines(['1', '2', 'Fizz', '4', 'Buzz', 'Fizz', '7', '8', 'Fizz', 'Buzz', '11', 'Fizz', '13', '14', 'FizzBuzz', '16', '17', 'Fizz', '19', 'Buzz'])" }],
    // As for grind_6: typed answers (in prints, or in a list a loop prints) have Fizz six times and Buzz four.
    // A program that works them out types each word once, or twice with "Fizz" + "Buzz".
    concepts: [{ expr: "sum(s.lower().count('fizz') for s in str_consts()) <= 3 and sum(s.lower().count('buzz') for s in str_consts()) <= 3", hint: "Let your program decide for each number whether to print Fizz, Buzz or FizzBuzz, instead of typing the answers in." }],
  },
};
