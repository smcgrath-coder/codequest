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

// R, a list of lines, with capitals, spaces and punctuation left out, so only letters and digits are compared.
// From attempt 3 grading.py shows the first failed probe's hint after the output's, so a probe whose rerun only shows
// text the first run showed too compares this way: a slip in capitals, spaces or punctuation fails the output check,
// which names it, and isn't also blamed on typed answers. Where a rerun shows words the first run never printed
// (an else's message), an exact probe with its own hint about spelling comes after the loose one.
const LOOSE = String.raw`(lambda R: [re.sub(r'[\W_]+', '', l.lower()) for l in R])`;

// Fails only when L matches one of the line lists in Ws (Python source) once capitals are ignored, but none of them
// exactly, so a slip in capitals is named before a check whose hint is about the words.
const capsOnly = (Ws, hint) => ({ expr: `(lambda Ws: any(L == W for W in Ws) or not any([l.lower() for l in L] == [w.lower() for w in W] for W in Ws))(${Ws})`, hint });

// Output checks for the lines W that count only the lines keep (a Python lambda) picks, so extra lines like a header,
// a blank line or a "Wrong password" are fine. grading.py names a near miss only for a literal lines([...]) check,
// which can't leave lines out, so the last two checks name it instead: spaces, then capitals and punctuation.
// checks are [expr, hint] pairs about K, the kept lines, and run first.
const keptLines = (keep, W, checks, spaces, caps) => {
  const K = `[l for l in L if ${keep}(l)]`, w = JSON.stringify(W);
  return [
    ...checks.map(([expr, hint]) => ({ expr: `(lambda K: ${expr})(${K})`, hint })),
    { expr: `(lambda K, W: K == W or [''.join(k.split()) for k in K] != [''.join(x.split()) for x in W])(${K}, ${w})`, hint: spaces },
    { expr: `${K} == ${w}`, hint: caps },
  ];
};

// ch1_boss: the sentence's pattern with capitals ignored (Python source), and the line of L that it matches.
const BOSS = String.raw`r'(?i)My name is (.+), I am (.+), and I love (.+)'`;
const BOSS_LINE = `next(l for l in L if re.fullmatch(${BOSS}, l))`;

// ch3_r2: a line that isn't blank.
const NONBLANK = String.raw`(lambda l: l.strip() != '')`;

// ch4_r3: whether line l calls its letter a vowel or a consonant ('?' if neither). The first of the two words counts,
// flipped by a "not" just before it, so "p is not a vowel" and "p is a consonant, not a vowel" are consonants.
const KIND = String.raw`(lambda l: (lambda m: '?' if not m else 'vowel' if (m.group(2).lower() == 'vowel') != bool(m.group(1)) else 'consonant')(re.search(r"(?i)(\bnot\s+(?:an?\s+)?|n[’']t\s+(?:an?\s+)?|\bisnt\s+(?:an?\s+)?)?\b(vowel|consonant)", l)))`;

// ch4_s3: a Trying: line or the Access granted! line, with capitals, spaces and punctuation ignored (as in LOOSE).
const S3_KEEP = String.raw`(lambda l: (lambda z: z.startswith('trying') or z == 'accessgranted')(re.sub(r'[\W_]+', '', l.lower())))`;
// ch4_s3: true when the first run's kept lines are wrong even with capitals, spaces and punctuation ignored.
const S3_OFF = `${LOOSE}(list(filter(${S3_KEEP}, L))) != ['tryingjava', 'tryingruby', 'tryingpython', 'accessgranted']`;

// ch4_r2 and grind_3: a line that shows numbers, not one that introduces them ("Countdown:", "Remainders of 97:").
const NUM_LINE = String.raw`(lambda l: bool(re.search(r'\d', l)) and not l.rstrip().endswith(':'))`;
// grind_3: the lines of L that show remainders. A line whose only number is 97 introduces them too.
const REMAINDER_LINES = String.raw`[l for l in L if ${NUM_LINE}(l) and set(re.findall(r'\d+', l)) != {'97'}]`;

// ch3_r1 and ch3_s3: the True/False answers in R. On one line, every one counts (print(a > b, a < b, ...)); on
// several, the last one on each line does, so labels like "a > b: True" are fine and a line with none gives ''.
const BOOLS = String.raw`(lambda R: re.findall(r'\b(?:True|False)\b', R[0]) if len(R) == 1 else [(re.findall(r'\b(?:True|False)\b', l) or [''])[-1] for l in R])`;
// R holds n answers, each True or False. Checked before which ones they are, so each failure gets its own hint.
const nBools = (R, n) => `(lambda B: len(B) == ${n} and '' not in B)(${BOOLS}(${R}))`;

// ch3_s1: the last truthy or falsy word on each line of L that has one, so labels like "0 is falsy" are fine, and so is
// a line with neither, like a "Testing values:" header. "truthy or falsy" together, as in a header, doesn't count.
const TRUTHY_WORDS = String.raw`[w for w in [(re.findall(r'(?i)\b(?:truthy|falsy|falsey)\b', re.sub(r'(?i)\b(?:truthy|falsey|falsy)\s*(?:or|/)\s*(?:truthy|falsey|falsy)\b', ' ', l)) or [''])[-1].lower().replace('falsey', 'falsy') for l in L] if w]`;

// grind_4: the letter grades in text t, each a capital A-F standing alone. When there's more than one, an A that
// starts a sentence and comes before a lowercase word ("A score of 73 gets a C") is the word "a", not a grade.
const GRADES = String.raw`(lambda t: (lambda g: g if len(g) < 2 else re.findall(r'\b[A-F]\b', re.sub(r'(?m)(^|[.!?]\s+)A(?=\s+[a-z])', r'\1', t)))(re.findall(r'\b[A-F]\b', t)))`;

// grind_5: what line l says about the year: -1 not a leap year, 1 a leap year, 0 neither. grading.py's polarity()
// reads "2023 is a regular year" or "Common year" as neither, and "isn’t" (with a curly ’) as a leap year.
const LEAP = String.raw`(lambda l: -1 if re.search(r"(?i)\b(?:not|no|nope|false|isnt|regular|common|normal|ordinary|non-leap)\b|n[’']t\b", l) else 1 if re.search(r'(?i)\b(?:leap|true|yes)\b', l) else 0)`;

// ch2_s1: PARITY(n) reads every place the number n is printed, up to the next of 15, 42 or 7 on that line,
// and says True if that place calls it even, False if odd, None if neither. The last even/odd word counts,
// flipped by a "not" just before it ("15 is not even") or a "no"/"false" after it ("Is 15 even? No"), so
// "Is 15 even? No, it is odd" reads as odd. Headers don't count: "even or odd" (or "odd or even") together says
// neither, and a line that names two of the numbers with no even/odd word between them ("Checking 15, 42 and 7
// to see which are even!") is about all of them, not an answer. "15 % 2 = 1, so 15 is odd" names only one.
const PARITY = String.raw`(lambda n: (lambda t: [(lambda s, ms: None if not ms else (ms[-1].group(2).lower() == 'even') ^ bool(ms[-1].group(1)) ^ bool(re.search(r'(?i)\b(?:no|false)\b', s[ms[-1].end():])))(s, list(re.finditer(r"(?i)(\bnot\s+(?:an?\s+)?|n[’']t\s+(?:an?\s+)?|\bisnt\s+(?:an?\s+)?)?\b(even|odd)\b", s))) for s in re.findall(r'\b%d\b((?:(?!\b(?:15|42|7)\b)[^\n])*)' % n, t)])('\n'.join(l for l in re.sub(r'(?i)\b(?:even|odd)\s*(?:or|/)\s*(?:even|odd)\b', ' ', out).split('\n') if not (lambda m: m and not re.search(r'(?i)\b(?:even|odd)\b', m.group(2)))(re.match(r'.*?\b(15|42|7)\b(.*?)\b(?!\1\b)(?:15|42|7)\b', l)))))`;

// A % inside a loop, a function or a comprehension works on every number it is given.
const MOD_IN_LOOP = String.raw`any(isinstance(m, ast.BinOp) and isinstance(m.op, ast.Mod) for n in ast.walk(TREE) if isinstance(n, (ast.For, ast.While, ast.FunctionDef, ast.Lambda, ast.ListComp, ast.GeneratorExp)) for m in ast.walk(n))`;

// type() shown by Python itself: called at least once, never on a typed-in value, and no "<class" typed.
const REAL_TYPES = String.raw`calls('type') >= 1 and not any(isinstance(n, ast.Call) and isinstance(n.func, ast.Name) and n.func.id == 'type' and n.args and isinstance(n.args[0], ast.Constant) for n in ast.walk(TREE)) and not any('<class' in s for s in str_consts())`;

// ch3_s1: an if that tests the value itself (`if value:` or `if not value:`), with no == or other comparison. The
// task asks for if/else, so the inline form, print("truthy" if value else "falsy"), counts too.
const TRUTHY_IF = String.raw`(lambda n: isinstance(n, (ast.If, ast.IfExp)) and (not isinstance(n.test, (ast.Compare, ast.BoolOp, ast.UnaryOp)) or (isinstance(n.test, ast.UnaryOp) and isinstance(n.test.op, ast.Not) and not isinstance(n.test.operand, (ast.Compare, ast.BoolOp, ast.UnaryOp)))))`;

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
    // The task only says "Then print it", so a label around the name ("My hero is Luna", f"Hero: {hero_name}") is
    // fine. The variable is checked first, so a kid who named it something else is told that, not to print the name.
    output: [
      { expr: "isinstance(ns.get('hero_name'), str) and ns['hero_name'].strip() != ''", hint: "Make a variable called hero_name and put a name inside it, in quotes." },
      { expr: "ns['hero_name'].strip() in out", hint: "Print the name that's stored in hero_name." },
    ],
    // Only once hero_name holds a name, as the first output check asks: before that, rerun() has nothing to change.
    probes: [{ expr: "not (isinstance(ns.get('hero_name'), str) and ns['hero_name'].strip()) or 'Zorp' in '\\n'.join(rerun({'hero_name': \"'Zorp'\"})[0])", hint: "Print the hero_name variable, with no quotes around it, instead of typing the name." }],
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
    output: [
      capsOnly("[[f\"I love {ns.get('food')} so much!\"]]", "So close! Check your capital letters: the task writes I love with a capital I."),
      { expr: "L == [f\"I love {ns.get('food')} so much!\"]", hint: "Print I love, then your food, then so much! on one line." },
    ],
    concepts: [
      { expr: "fstrings() >= 1", hint: "This room is about f-strings. Put an f before the quotes and your variable in {curly braces}." },
      // Not in rules_a.py: print(f"I love", food, "so much!") is an f-string with no {}, and passed. So did
      // print(f"{sentence}") with the sentence glued together by +, so the {} must hold food itself (as in ch2_r4).
      { expr: "any(isinstance(n, ast.FormattedValue) and any(isinstance(m, ast.Name) and m.id == 'food' for m in ast.walk(n.value)) for n in ast.walk(TREE))", hint: "Put {food} inside the quotes of your f-string, so Python fills in the food for you." },
    ],
    probes: [
      { expr: "isinstance(ns.get('food'), str) and ns['food'].strip() != ''", hint: "Make a variable called food and put your favorite food inside it, in quotes." },
      { expr: `${LOOSE}(rerun({'food': "'tacos'"})[0]) == ${LOOSE}(['I love tacos so much!'])`, hint: "Put {food} in your f-string instead of typing the food, so the sentence changes when food does." },
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
    output: [
      capsOnly("[[f\"{ns.get('greeting')}, {ns.get('name')}! Welcome to CodeQuest.\"], [f\"Hello, {ns.get('name')}! Welcome to CodeQuest.\"]]", "So close! Check your capital letters: the task writes Hello, Welcome and CodeQuest with capitals."),
      { expr: "L == [f\"{ns.get('greeting')}, {ns.get('name')}! Welcome to CodeQuest.\"] or L == [f\"Hello, {ns.get('name')}! Welcome to CodeQuest.\"]", hint: "Check the pieces you glue together: the comma, the spaces, the ! and the period at the end all have to be there." },
    ],
    concepts: [
      { expr: "fstrings() == 0", hint: "No f-strings in this room: join the pieces with + instead." },
      // message += name glues with + too.
      { expr: "binop('Add') + sum(isinstance(n, ast.AugAssign) and isinstance(n.op, ast.Add) for n in ast.walk(TREE)) >= 1", hint: "Use the + sign to glue your strings together." },
    ],
    probes: [
      { expr: "ns.get('greeting') == 'Hello' and isinstance(ns.get('name'), str) and ns['name'].strip() != ''", hint: "Make greeting hold just \"Hello\", with no comma or space inside it, and make name hold any name you like." },
      { expr: `${LOOSE}(rerun({'name': "'Zed'"})[0]) == ${LOOSE}(['Hello, Zed! Welcome to CodeQuest.'])`, hint: "Join your greeting and name variables with +, instead of typing the name into the text." },
      // Not in rules_a.py: greeting = "Hello" set but a typed "Hello" + ", " + name + ... passed.
      { expr: `${LOOSE}(rerun({'greeting': "'Hi'", 'name': "'Zed'"})[0]) == ${LOOSE}(['Hi, Zed! Welcome to CodeQuest.'])`, hint: "Use your greeting variable in the line too, instead of typing Hello into the text." },
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
    // Other lines, like a print("Hello!") first, are fine: the task only asks for the sentence. It is found with
    // capitals ignored, so a slip in them gets the second check's hint, and the probes still find the sentence.
    output: [
      { expr: `sum(bool(re.fullmatch(${BOSS}, l)) for l in L) == 1`, hint: "Print one sentence that follows the pattern, commas and all: My name is ___, I am ___, and I love ___" },
      { expr: "any(re.fullmatch(r'My name is (.+), I am (.+), and I love (.+)', l) for l in L)", hint: "So close! Check your capital letters: My and both I's start with a capital, just like in the task." },
    ],
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
      { expr: `all(any(str(v) == cap for k, v in ns.items() if not k.startswith('__')) for cap in re.fullmatch(${BOSS}, ${BOSS_LINE}).groups())`, hint: "Fill each ___ blank with just one variable in {curly braces}, and add no extra words or punctuation, not even at the end." },
      // Not in rules_a.py: the check above only asks that each blank holds some variable, so {game} in the name
      // blank and {name} in the game blank passed. Names are the kid's choice (my_name, favorite_game), so a blank is
      // out of place only when every variable holding its value is named after another blank and not its own.
      // A swap moves two, and needing two keeps one odd name (a gamertag for the name) from failing.
      { expr: String.raw`(lambda owners: sum(bool(owners(c)) and all(own not in n and any(k in n for k in ('name', 'age', 'game') if k != own) for n in owners(c)) for c, own in zip(re.fullmatch(${BOSS}, ${BOSS_LINE}).groups(), ('name', 'age', 'game'))) < 2)(lambda c: [k.lower() for k, v in ns.items() if not k.startswith('__') and not callable(v) and str(v) == c])`, hint: "Check the order of your blanks: your name goes first, then your age, then your favorite game." },
    ],
  },
  grind_0: {
    output: [
      spacing(['####', '#  #', '#  #', '####'], "So close! Your # signs are right, but check the spaces in each row against the box in the task."),
      { expr: "lines(['####','#  #','#  #','####'])" },
    ],
  },
  grind_1: {
    // The variables are checked first, so a kid who named them pet, snack and count is told that, not to fix a
    // sentence that already reads right.
    output: [
      { expr: "all(k in ns for k in ('animal', 'food', 'number'))", hint: "Make three variables called animal, food and number." },
      capsOnly("[[f\"The {ns.get('animal')} ate {ns.get('number')} {ns.get('food')}s\"]]", "So close! Check your capital letters: the sentence starts with a capital T, and the rest is written just like the task."),
      { expr: "L == [f\"The {ns.get('animal')} ate {ns.get('number')} {ns.get('food')}s\"]", hint: "Print one line: The, your animal, ate, your number, then your food with an s on the end." },
    ],
    // The reruns only count once the three variables exist, as the first output check asks: before that, rerun()
    // has nothing to change. Both also accept `animal, food, number = ...` that uses all three (see unpacked above).
    probes: [
      { expr: `not all(k in ns for k in ('animal', 'food', 'number')) or (lambda R: R[:1] and R[0].startswith('thedogate'))(${LOOSE}(rerun({'animal': "'dog'"})[0])) or ${unpacked(['animal', 'food', 'number'])}`, hint: "Use your variables in the sentence instead of typing the words, so it changes when they do." },
      // Not in rules_a.py: the rerun above only changes animal, so typing the food and number passed.
      // number goes in as text, so a program that joins it with + still works.
      { expr: `not all(k in ns for k in ('animal', 'food', 'number')) or ${LOOSE}(rerun({'animal': "'dog'", 'food': "'bone'", 'number': "'2'"})[0]) == ${LOOSE}(['The dog ate 2 bones']) or ${unpacked(['animal', 'food', 'number'])}`, hint: "Use all three variables in the sentence, food and number too, instead of typing them." },
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
    // rules_a.py wanted the three results alone on their lines. The task shows no exact output and doesn't ask for
    // one line each, so a label around each one ("Upper: THE VAULT AWAITS"), all three in one print() (as ch2_r1
    // allows) and an extra line are fine, as long as the three come in the task's order.
    output: [
      { expr: "'THE VAULT AWAITS' in out", hint: "Print message.upper(), so the message shows in capital letters." },
      { expr: "has('THE VAULT AWAITS', 'the quest awaits')", hint: "After that, print message.replace(\"vault\", \"quest\"), so the word vault is swapped for quest." },
      { expr: String.raw`re.search(r'THE VAULT AWAITS[\s\S]*the quest awaits[\s\S]*?(?<![\d.])16(?![\d.])', out) is not None`, hint: "Then print len(message), so Python counts the characters in the message." },
    ],
    // Each result the first run showed must change with message. One it didn't show isn't looked for, so a slip the
    // output checks already named (a capital Q in quest) isn't also blamed on typed answers.
    probes: [{ expr: String.raw`(lambda t: ('THE VAULT AWAITS' not in out or 'A VAULT B' in t) and ('the quest awaits' not in out or 'a quest b' in t) and (not re.search(r'(?<![\d.])16(?![\d.])', out) or re.search(r'(?<![\d.])9(?![\d.])', t) is not None))('\n'.join(rerun({'message': "'a vault b'"})[0]))`, hint: "Use .upper(), .replace() and len() on the message variable instead of typing the results." }],
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
      // find 100, 10 and 110 in order, and each needs a word right before or after it on its own line (between it
      // and its neighbours), which fails "Subtotal: 100 10.0 110.0". Only its own line counts, or the next line's
      // "Tax:" labels a bare 100 above it; a line holding just a label, like "Subtotal:" above the 100, counts too.
      // Decimals are rounded to 6 places first, so total = subtotal * 1.1 (110.00000000000001) isn't told to add
      // labels it has; the probe below names its formula.
      { expr: String.raw`(lambda m: bool(m) and all(re.search('[A-Za-z]', m.group(i).rsplit('\n', 1)[-1] + m.group(i + 1).split('\n', 1)[0]) or (m.group(i).count('\n') >= (1 if i == 1 else 2) and re.fullmatch(r'\D*[A-Za-z]\D*', m.group(i).split('\n')[-2])) for i in (1, 2, 3)))(re.search(r'^(.*?)(?<![\d.])100(?:\.0+)?(?![\d.])(.*?)(?<![\d.])10(?:\.0+)?(?![\d.])(.*?)(?<![\d.])110(?:\.0+)?(?![\d.])(.*)$', re.sub(r'\d+\.\d+', lambda f: ('%.6f' % float(f.group())).rstrip('0').rstrip('.'), out), re.S))`, hint: "Put a label next to each number, like Subtotal:, so the shopper knows what it is." },
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
      // line, so "15 is odd, 42 is even" on one line and a later "Even numbers are cool!" line are fine, and so is a
      // header like "Testing 15, 42 and 7 for odd or even:". A number and its word on separate lines fail the
      // second check, whose hint says to put them on one line.
      { expr: `(lambda V: not (True in V(15) + V(7) or False in V(42)))(${PARITY})`, hint: "One of your numbers says the wrong thing: a number is even when number % 2 is 0." },
      { expr: `(lambda V: False in V(15) and True in V(42) and False in V(7))(${PARITY})`, hint: "For each number, print the number and just one of the words even or odd, both on the same line." },
    ],
    // rules_a.py had binop('Mod') >= 1, which one stray print(15 % 2) passed with the answers typed.
    concepts: [{ expr: `binop('Mod') >= 3 or ${MOD_IN_LOOP}`, hint: "Use % 2 on each of the three numbers, so Python works out every answer." }],
  },
  ch2_s2: {
    output: [{ expr: "lines(['CodeCodeCode', 'C', 'e', '--------------------'])" }],
    // Each line the first run got right must change with word; one it got wrong was already named by the output
    // check, so it isn't also blamed on typed letters.
    probes: [{ expr: "(lambda R: all(r == wr for l, w, r, wr in zip(L, ['CodeCodeCode', 'C', 'e', '-' * 20], R, ['RobotRobotRobot', 'R', 't', '-' * 20]) if l == w))(rerun({'word': \"'Robot'\"})[0])", hint: "Use word with *, [0] and [-1] instead of typing the letters, so it works for any word." }],
  },
  ch2_s3: {
    // rules_a.py wanted the two type lines alone. The task says to print them "to prove they're different", so a
    // label around each ("price_text is <class 'str'>") is fine. Still a lines([...]) check, so a wrong line is named.
    output: [{ expr: "lines(['3 items at $49 = $147', \"re:.*<class 'str'>.*\", \"re:.*<class 'int'>.*\"])" }],
    // Not in rules_a.py: the two type lines typed by hand, or type("49") and type(147), passed.
    concepts: [{ expr: REAL_TYPES, hint: "Print type(price_text) and type(total), so Python shows each variable's type, instead of typing it." }],
    probes: [
      { expr: "type(ns.get('total')) is int and ns['total'] == 147", hint: "Store your answer in a variable called total, and make it a whole number by using int() on price_text." },
      // The total's number, not "$30": a missing $ fails the output check, which names that line.
      { expr: String.raw`re.search(r'(?<![\d.])30(?![\d.])', '\n'.join(rerun({'price_text': "'10'"})[0])) is not None`, hint: "Work out total from price_text instead of typing the answer, so it works for any price." },
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
    // The task doesn't ask for one per line, so all four on one line passes too, and so does a header line before
    // them, like "Remainders of 97:" (see REMAINDER_LINES above).
    // Split in two, so four lines with a wrong remainder are told that, not how to lay the lines out.
    output: [
      { expr: String.raw`(lambda K: len(K) == 4 or (len(K) == 1 and len(re.findall(r'-?\d+(?:\.\d+)?', K[0])) >= 4))(${REMAINDER_LINES})`, hint: "Print the four remainders, for 2, 3, 5 and 7, in that order." },
      { expr: String.raw`(lambda K: nums_per_line([1, 1, 2, 6], L=K) or (len(K) == 1 and nums([1, 1, 2, 6], L=K)))(${REMAINDER_LINES})`, hint: "One of your remainders isn't right yet. Check that each line uses 97, the % sign and the right number: 2, then 3, then 5, then 7." },
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
    // Split in two: a typed answer never changes, while a wrong sign (a >= b for a > b, the lesson's classic slip)
    // changes but not always the right way. In these four runs every one of the five answers is True at least once and
    // False at least once, so the first check only fails an answer that stays the same.
    probes: [
      { expr: `(lambda runs: all(len(set(c)) > 1 for c in zip(*runs)))([${BOOLS}(L)] + [${BOOLS}(rerun({'a': a, 'b': b})[0]) for a, b in [('3', '5'), ('3', '3'), ('7', '9')]])`, hint: "Print each comparison itself, using a and b, instead of typing True or False." },
      // Only once the first run's answers are right: otherwise the output check has already named the wrong one.
      { expr: `${BOOLS}(L) != ['True', 'False', 'True', 'True', 'True'] or all(${BOOLS}(rerun({'a': a, 'b': b})[0]) == want for a, b, want in [('3', '5', ['False', 'True', 'False', 'True', 'True']), ('3', '3', ['False', 'False', 'False', 'False', 'False']), ('7', '9', ['False', 'True', 'False', 'True', 'True'])])`, hint: "Check each comparison's letters, numbers and signs against the task: > is not the same as >=, and < is not the same as <=." },
    ],
  },
  ch3_r2: {
    // Blank lines don't count, so a print() between the two checks is fine (see keptLines above).
    output: keptLines(NONBLANK, ['You passed!', 'Try again!'], [
      ["len(K) == 2", "Do the check twice, once with score = 85 and again after score = 50, so your program prints two lines."],
      [`${LOOSE}(K[:1]) == ['youpassed']`, "Check your first if/else: a score of 85 is 70 or more, so it should print You passed!"],
      [`${LOOSE}(K[1:]) == ['tryagain']`, "Check your second if/else: a score of 50 is under 70, so it should print Try again!"],
    ], "So close! Check the spaces in your messages: they should look just like You passed! and Try again! in the task.",
    "So close! Check your capital letters and punctuation: You passed! and Try again! each have one capital letter and an exclamation mark at the end."),
    // The first run shows only the first check's You passed! and the second's Try again!, so the loose probes (see
    // LOOSE above) come first, then the exact one names a slip in the messages the first run didn't print. A rerun
    // that changes one score is only read on the line that score prints, since the other line is the first run's.
    probes: [
      { expr: `${LOOSE}([l for l in rerun({'score': '50'})[0] if l.strip()])[:1] == ['tryagain']`, hint: "Use an if/else that checks score, instead of typing the answers." },
      { expr: `${LOOSE}([l for l in rerun({'score#2': '90'})[0] if l.strip()])[1:2] == ['youpassed']`, hint: "Do the same if/else check again after score = 50, instead of typing the answer." },
      { expr: "[l for l in rerun({'score': '50'})[0] if l.strip()][:1] == ['Try again!'] and [l for l in rerun({'score#2': '90'})[0] if l.strip()][1:2] == ['You passed!']", hint: "Check the spelling, capitals and punctuation of every message in your if/else checks, even the ones that didn't print this time." },
      // rules_a.py only tried 70 here, so `score > 50` or `score >= 60` passed; 69 must not pass.
      { expr: "[l for l in rerun({'score': '70'})[0] if l.strip()][:1] == ['You passed!'] and [l for l in rerun({'score': '69'})[0] if l.strip()][:1] == ['Try again!']", hint: "Check your comparison: a score of 70 or more should pass, and anything under 70 should not." },
      // Not in rules_a.py: the second score was only tried at 50 and 90, so a second check of
      // `score <= 50` or `score == 50` passed.
      { expr: "[l for l in rerun({'score#2': '70'})[0] if l.strip()] == ['You passed!', 'You passed!'] and [l for l in rerun({'score#2': '69'})[0] if l.strip()] == ['You passed!', 'Try again!']", hint: "Make your second check the same as your first one, so it also passes 70 or more and says Try again! for anything less." },
    ],
  },
  ch3_r3: {
    output: [{ expr: "lines(['Warm'])" }],
    // rules_a.py never tried a temp in 80-89, 60-69 or 40-49, so thresholds like >= 80, >= 60 or >= 40 passed;
    // 89, 69 and 49 (just under each edge) catch them. The first run only shows Warm, so the groups are checked
    // loosely first (see LOOSE above), then the other three words exactly, with a hint about spelling.
    probes: [
      { expr: `all(${LOOSE}(rerun({'temp': t})[0]) == ${LOOSE}([w]) for t, w in [('95','Hot'), ('90','Hot'), ('89','Warm'), ('70','Warm'), ('69','Cool'), ('55','Cool'), ('50','Cool'), ('49','Cold'), ('30','Cold')])`, hint: "Use if/elif/else on temp, with the same numbers and >= signs as the task, so every temperature lands in the right group." },
      { expr: "all(rerun({'temp': t})[0] == [w] for t, w in [('95','Hot'), ('69','Cool'), ('49','Cold')])", hint: "Write each group's word just like the task, starting with a capital letter: Hot, Warm, Cool and Cold." },
    ],
  },
  ch3_r4: {
    output: [{ expr: "lines(['Access granted'])" }],
    concepts: [{ expr: "boolop('or')", hint: "Join your two checks with or, so either one can open the gate." }],
    // rules_a.py's one check here told `age >= 12 or has_permission` and `or "has_permission"` (always true)
    // to use if/else, which they did. Split so a wrong test and a missing else get their own hints.
    probes: [
      { expr: `'accessgranted' not in ${LOOSE}(rerun({'has_permission': 'False'})[0])`, hint: "With has_permission set to False, a 12-year-old shouldn't get in. Check your age test, and use has_permission itself, with no quotes around it." },
      { expr: "rerun({'has_permission': 'False'})[0] == ['Access denied']", hint: "Add an else that prints Access denied, written just like the task, for when neither check is true." },
      // rules_a.py only tried 15, so `age > 13` or `age >= 14` passed; 13 itself must get in.
      { expr: `all(${LOOSE}(rerun({'has_permission': 'False', 'age': a})[0]) == ['accessgranted'] for a in ('13', '15'))`, hint: "Anyone 13 or older should get in even without permission, so check your age test: 13 itself counts." },
    ],
  },
  ch3_r5: {
    output: [{ expr: "lines(['Easy win!'])" }],
    // nested_if() alone missed `if not has_sword: ... else:` with the if/else inside the else, because in the
    // ast that looks just like an elif. Only the column tells them apart: an elif starts where its if does.
    concepts: [{ expr: "nested_if() or any(isinstance(n, ast.If) and len(n.orelse) == 1 and isinstance(n.orelse[0], ast.If) and n.orelse[0].col_offset > n.col_offset for n in ast.walk(TREE))", hint: "Put an if/else inside another if, so the monster check only happens when you have a sword." }],
    probes: [
      // Split in three, so a missing inner else (Easy win! printed after every fight) and a typo in Tough fight!,
      // which the first run never prints, each get their own hint. Loose (see LOOSE above) until the typo check.
      { expr: `'toughfight' in ${LOOSE}(rerun({'monster_health': '80'})[0])`, hint: "Check monster_health with an if, so a strong monster gives a tough fight." },
      { expr: `${LOOSE}(rerun({'monster_health': '80'})[0]) == ['toughfight']`, hint: "A strong monster should print only Tough fight!, so put Easy win! in the else of your monster_health check." },
      { expr: "rerun({'monster_health': '80'})[0] == ['Tough fight!']", hint: "Write Tough fight! just like the task, with the same capital letters and punctuation." },
      // Not in rules_a.py: 50 was never tried, so `monster_health >= 50` passed.
      { expr: `${LOOSE}(rerun({'monster_health': '51'})[0]) == ['toughfight'] and ${LOOSE}(rerun({'monster_health': '50'})[0]) == ['easywin']`, hint: "Check your comparison: only a monster with more than 50 health is a tough fight, so 50 itself is an easy win." },
      // Split from rules_a.py's one check, so a message typo ("You need a sword!") isn't told to check has_sword.
      { expr: `not any(m in ${LOOSE}(rerun({'has_sword': 'False'})[0]) for m in ('easywin', 'toughfight'))`, hint: "Check has_sword first, so a hero without a sword doesn't fight the monster at all." },
      { expr: "rerun({'has_sword': 'False'})[0] == ['You need a weapon!']", hint: "When has_sword is False, print You need a weapon! in your else, written just like the task." },
    ],
  },
  ch3_s1: {
    // rules_a.py wanted the bare words. print(value, "is falsy") is fine too, so each line's last truthy or falsy
    // counts, and a line with neither, like a "Testing values:" header, is left out (see TRUTHY_WORDS above).
    output: [
      { expr: `len(${TRUTHY_WORDS}) == 5`, hint: "Print one line for each of the five values, in the same order as the list, with the word truthy or falsy on it." },
      { expr: `${TRUTHY_WORDS} == ['falsy', 'falsy', 'truthy', 'truthy', 'falsy']`, hint: "One of your values has the wrong answer. Test each value all by itself, with if value:, and let Python decide." },
    ],
    concepts: [
      // rules_a.py refused every UnaryOp, which failed `if not value:`; a `not` in front of the bare value is fine.
      { expr: `any(map(${TRUTHY_IF}, ast.walk(TREE)))`, hint: "Test the value all by itself, with if value:, and no == or other comparison." },
      // Not in rules_a.py: one `if 0:` with the other four answers typed passed. The task asks to test
      // every value, so there must be five such ifs, or one in a loop, a function or a comprehension.
      { expr: `(lambda ok: sum(map(ok, ast.walk(TREE))) >= 5 or any(ok(m) for n in ast.walk(TREE) if isinstance(n, (ast.For, ast.While, ast.FunctionDef, ast.Lambda, ast.ListComp, ast.GeneratorExp)) for m in ast.walk(n)))(${TRUTHY_IF})`, hint: "Test all five values with if/else, not just one: use a loop, or one if/else for each value." },
    ],
  },
  ch3_s2: {
    output: [{ expr: "lines(['minor', 'boiling', 'game over'])" }],
    concepts: [{ expr: "count(ast.IfExp) >= 3", hint: "Use the inline form for all three, like print(\"yes\" if test else \"no\")." }],
    // The first run only shows minor, boiling and game over, so the other three words are first checked loosely
    // (see LOOSE above), then exactly, with a hint about spelling. Then one edge per test, each with its own hint.
    probes: [
      { expr: `${LOOSE}(rerun({'age': '20', 'temp': '50', 'lives': '3'})[0]) == ${LOOSE}(['adult', 'not yet', 'keep going'])`, hint: "Base each answer on age, temp and lives, instead of typing the words." },
      { expr: "rerun({'age': '20', 'temp': '50', 'lives': '3'})[0] == ['adult', 'not yet', 'keep going']", hint: "Write every answer just like the task, in small letters: adult, not yet and keep going too, not just the ones printed now." },
      // Not in rules_a.py: no test sat on an edge, so `age > 18` (or temp == 100, or lives != 3) passed. One probe
      // for each test, so a wrong lives test (lives > 1) isn't told about age and temp.
      { expr: "rerun({'age': '18'})[0][:1] == ['adult'] and rerun({'age': '17'})[0][:1] == ['minor']", hint: "Check your age test: 18 or older is an adult, so 18 itself counts." },
      { expr: "rerun({'temp': '150'})[0][1:2] == ['boiling'] and rerun({'temp': '99'})[0][1:2] == ['not yet']", hint: "Check your temp test: 100 or more is boiling, so 150 is boiling too, and 99 is not yet." },
      { expr: "rerun({'lives': '1'})[0][2:3] == ['keep going']", hint: "Check your lives test: it's only game over when lives is exactly 0, so 1 life means keep going." },
    ],
  },
  ch3_s3: {
    // rules_a.py wanted the bare True/False lines. The task words each check as a question, so a label like
    // "Is x between 1 and 50? True" is fine, as in ch3_r1 (see BOOLS above).
    output: [
      { expr: nBools('L', 3), hint: "Print the three chained comparisons from the task, in order, and leave the quotes off so Python prints True or False." },
      { expr: `${BOOLS}(L) == ['True', 'False', 'True']`, hint: "One of your answers isn't right yet. Check the numbers and signs in each chained comparison against the task." },
    ],
    concepts: [{ expr: "chained() >= 3", hint: "Write each check as one chained comparison with x in the middle, like 0 < x < 99." }],
    probes: [
      // Only once the first run's answers are right: otherwise the output check has already named the wrong one.
      { expr: `${BOOLS}(L) != ['True', 'False', 'True'] or ${BOOLS}(rerun({'x': '40'})[0]) == ['True', 'True', 'True']`, hint: "Compare x itself in each line, instead of typing True or False." },
      // rules_a.py only tried x = 5 here, so no upper end was ever tested: 30 <= x <= 50 on line 2, or
      // 10 < x < 100 on line 3, passed. 75, 150 and 0 test the other ends; the edges themselves aren't
      // tried here, since "between 1 and 50" can mean < or <=.
      { expr: `all(${BOOLS}(rerun({'x': v})[0]) == w for v, w in [('5', ['True', 'False', 'False']), ('75', ['False', 'True', 'False']), ('150', ['False', 'False', 'False']), ('0', ['False', 'False', 'False'])])`, hint: "Check the numbers in each chained comparison, the low end and the high end, against the range from the task." },
      // Not in rules_a.py: the third check is spelled out as 10 < x < 50, so 10 and 50 are outside it, and 10 <= x
      // or x <= 50 passed. x = 10 gives True, False, False on any reading of the first two; x = 50 is on the first
      // one's edge, so there only the last two answers count.
      { expr: `${BOOLS}(rerun({'x': '10'})[0]) == ['True', 'False', 'False'] and ${BOOLS}(rerun({'x': '50'})[0])[1:] == ['True', 'False']`, hint: "Check the signs in your third comparison: the task says 10 < x < 50, so neither 10 nor 50 counts." },
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
    // The first run only shows Great job!, so the other messages are checked first, exactly, in one run inside each
    // band, but only where that run's letter is right: a wrong letter is the next check's to name. The edges are
    // then checked with the messages compared loosely (see LOOSE above), so a slip in Great job!'s capitals, which
    // the output check names, isn't also blamed on the edges.
    probes: [
      { expr: "all((lambda t: not re.search(r'\\b%s\\b' % g, t) or m in t)('\\n'.join(rerun({'score': s})[0])) for s, g, m in [('99', 'A', 'Excellent!'), ('75', 'C', 'Not bad!'), ('65', 'D', 'Needs work'), ('30', 'F', 'Try harder!')])", hint: "Write every grade's message just like the task, with the same spelling, capital letters and punctuation, even the ones a score of 87 doesn't print." },
      { expr: String.raw`all((lambda R: re.search(r'\b%s\b' % g, '\n'.join(R)) and (lambda z: re.sub(r'[\W_]+', '', m.lower()) in z and sum(x in z for x in ('excellent', 'greatjob', 'notbad', 'needswork', 'tryharder')) == 1)('\n'.join(${LOOSE}(R))))(rerun({'score': s})[0]) for s, g, m in [('95','A','Excellent!'), ('90','A','Excellent!'), ('89','B','Great job!'), ('80','B','Great job!'), ('79','C','Not bad!'), ('75','C','Not bad!'), ('70','C','Not bad!'), ('69','D','Needs work'), ('65','D','Needs work'), ('60','D','Needs work'), ('59','F','Try harder!'), ('40','F','Try harder!')])`, hint: "Pick the grade with if/elif/else on score, and check each edge: exactly 90 is an A, 80 a B, 70 a C and 60 a D." },
    ],
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
    // `year == 1900` passed. 2100 and 2400 aren't named anywhere. Not in rules_a.py: 2020 (a leap year) and 2022
    // (even, but not divisible by 4) catch a wrong number in the first part, like year % 2 or year % 8.
    probes: [{ expr: `all([p for p in map(${LEAP}, rerun({'year': y})[0]) if p][-1:] == [want] for y, want in [('1900', -1), ('2000', 1), ('2020', 1), ('2022', -1), ('2023', -1), ('2100', -1), ('2400', 1)])`, hint: "Use every part of the rule from the task, with the same numbers, % and the words and/or, so your program is right for any year, not just 2024." }],
  },

  // ── Chapter 4: The Loop Tower ──
  ch4_r1: {
    output: [{ expr: "lines(['Step 0', 'Step 1', 'Step 2', 'Step 3', 'Step 4'])" }],
    concepts: [
      { expr: "count(ast.For) >= 1", hint: "Use a for loop with range() to print the steps." },
      // Not in rules_a.py: the five steps typed inside a for loop that runs once passed. f"Step {i}" and
      // "Step " + str(i) have no number in their text.
      { expr: String.raw`not any(re.search(r'(?i)step\s*\d', s) for s in str_consts())`, hint: "Let the loop count the steps: print Step with the loop's number, instead of typing each step yourself." },
    ],
  },
  ch4_r2: {
    // Header lines like "Even numbers:" and "Countdown:", which the starter's two sections invite, are fine (see
    // NUM_LINE above). The task gives no layout, but print() in a loop puts each number on its own line, and all ten
    // run together on one line don't show the two counts apart.
    output: [
      { expr: `len([l for l in L if ${NUM_LINE}(l)]) == 10`, hint: "Print ten numbers in all, each on its own line: 2 through 10 counting by 2, then 5 down to 1." },
      { expr: `[l for l in L if ${NUM_LINE}(l)] == ['2', '4', '6', '8', '10', '5', '4', '3', '2', '1']`, hint: "One of your numbers isn't right yet, so check the start, stop and step you give each range()." },
    ],
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
    // KIND (above) reads "p is not a vowel" as a consonant.
    output: [
      { expr: "len(L) == 6 and all(re.search(r'(?i)\\b%s\\b' % ch, l) and re.search(r'(?i)vowel|consonant', l) for l, ch in zip(L, 'python'))", hint: "Print one line for each letter, with the letter and the word vowel or consonant." },
      { expr: `[${KIND}(l) for l in L] == ['consonant', 'consonant', 'consonant', 'consonant', 'vowel', 'consonant']`, hint: "One of your letters has the wrong label. Only a, e, i, o and u are vowels, so check the test in your if." },
    ],
    // rules_a.py's word 'audio' has no e, so char in "aiou" passed; 'education' has all five vowels. Split so a loop
    // over a typed "python" instead of word is told that: its line count doesn't grow from 6 to 9 with the word (a
    // kid printing two lines a letter is already told about that). The labels are only read once the first run's
    // are right, since otherwise the output check has named the wrong one.
    probes: [
      { expr: "len(rerun({'word': \"'education'\"})[0]) * 6 == len(L) * 9", hint: "Loop through the word variable, so your program works for any word, not just python." },
      { expr: `[${KIND}(l) for l in L] != ['consonant', 'consonant', 'consonant', 'consonant', 'vowel', 'consonant'] or [${KIND}(l) for l in rerun({'word': "'education'"})[0]] == ['vowel', 'consonant', 'vowel', 'consonant', 'vowel', 'consonant', 'vowel', 'vowel', 'consonant']`, hint: "Check that your if counts all five vowels, a, e, i, o and u, so it works for other words too." },
    ],
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
    // Only once the first run's lines are right but for capitals, spaces or punctuation (see LOOSE above): a wrong
    // count has already been named by the output check, and isn't also blamed on typed numbers.
    probes: [{ expr: `${LOOSE}(L) != ${LOOSE}(['Energy: 10', 'Energy: 9', 'Energy: 8', 'Energy: 7', 'Energy: 6', 'Energy: 5', 'Energy: 4', 'Energy: 3', 'Energy: 2', 'Energy: 1', 'Energy: 0', 'Shutdown!']) or ${LOOSE}(rerun({'energy': '3'})[0]) == ${LOOSE}(['Energy: 3', 'Energy: 2', 'Energy: 1', 'Energy: 0', 'Shutdown!'])`, hint: "Count down from the energy variable in your loop, instead of typing the numbers." }],
  },
  ch4_r5: {
    output: [{ expr: "lines(['1', '3', '5', '7'])" }],
    concepts: [
      { expr: "count(ast.Continue) >= 1", hint: "Use continue to skip the even numbers." },
      { expr: "count(ast.Break) >= 1", hint: "Use break to stop the loop at the number divisible by 7." },
      // Not in rules_a.py: a loop that breaks before printing 7 (1, 3, 5), patched with a print(7) after it,
      // passed, and so did the four numbers typed into one print(). No print() needs a number typed into it (text
      // with a number in it, like "Found one divisible by 7!", is fine), while print(i) after the loop is fine.
      { expr: String.raw`not any(isinstance(n, ast.Call) and isinstance(n.func, ast.Name) and n.func.id == 'print' and any(isinstance(c, ast.Constant) and re.fullmatch(r'[\d\s,.]+', str(c.value)) for a in n.args for c in [a] + (a.values if isinstance(a, ast.JoinedStr) else [])) for n in ast.walk(TREE))`, hint: "Print each odd number from inside the loop with the loop's variable, instead of typing a number yourself." },
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
    // Extra lines, like a "Wrong password" after each miss, are fine: only the Trying: and Access granted! lines
    // count (see S3_KEEP above and keptLines).
    output: keptLines(S3_KEEP, ['Trying: java', 'Trying: ruby', 'Trying: python', 'Access granted!'], [
      [`${LOOSE}(K[:3]) == ['tryingjava', 'tryingruby', 'tryingpython']`, "For each guess, print Trying: and then the guess itself, before you check it against the password."],
      [`${LOOSE}(K[3:4]) == ['accessgranted']`, "When a guess matches the password, print Access granted! right after its Trying: line."],
      ["len(K) == 4", "Stop the loop with break as soon as a guess matches, so nothing more is tried after Access granted!"],
    ], "So close! Check the spaces: the task shows Trying: java, with one space after the colon.",
    "So close! Check your capital letters and punctuation: Trying: has a capital T and a colon, and Access granted! has a capital A and an exclamation mark."),
    concepts: [{ expr: "count(ast.Break) >= 1", hint: "Use break to stop the loop once the password is found." }],
    // Every line a rerun shows, the first run shows too, so they're compared loosely (see LOOSE above), and only once
    // the first run's lines are right that way: otherwise the output check has already named the problem.
    probes: [
      { expr: `${S3_OFF} or ${LOOSE}(list(filter(${S3_KEEP}, rerun({'password': "'ruby'"})[0]))) == ['tryingjava', 'tryingruby', 'accessgranted']`, hint: "Compare each guess to the password variable, so it still stops at the right guess if the password changes." },
      { expr: `${S3_OFF} or ${LOOSE}(list(filter(${S3_KEEP}, rerun({'password': "'java'"})[0]))) == ['tryingjava', 'accessgranted']`, hint: "Loop through guesses and stop as soon as one matches password." },
      // Not in rules_a.py: both reruns above have a password that is in the list, so printing
      // Access granted! after the loop, match or not, passed. Extra lines (like Access denied) are fine.
      { expr: `${S3_OFF} or (lambda R: R[:4] == ['tryingjava', 'tryingruby', 'tryingpython', 'tryingrust'] and 'accessgranted' not in R)(${LOOSE}(list(filter(${S3_KEEP}, rerun({'password': "'go'"})[0]))))`, hint: "Only print Access granted! when a guess matches the password, inside your if." },
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
    // A header like "Multiplication table for 7:" is fine: only lines with an = count (see keptLines above).
    output: keptLines(String.raw`(lambda l: '=' in l)`, ['7 x 1 = 7', '7 x 2 = 14', '7 x 3 = 21', '7 x 4 = 28', '7 x 5 = 35', '7 x 6 = 42', '7 x 7 = 49', '7 x 8 = 56', '7 x 9 = 63', '7 x 10 = 70'], [
      ["len(K) == 10", "Your table needs ten lines, from 7 x 1 = 7 up to 7 x 10 = 70."],
      [`${LOOSE}(K) == ${LOOSE}(['7 x 1 = 7', '7 x 2 = 14', '7 x 3 = 21', '7 x 4 = 28', '7 x 5 = 35', '7 x 6 = 42', '7 x 7 = 49', '7 x 8 = 56', '7 x 9 = 63', '7 x 10 = 70'])`, "One of your lines isn't right yet: each one shows 7, x, a number from 1 to 10, =, and 7 times that number."],
    ], "So close! Check the spaces: the task puts one space on each side of the x and the =, like 7 x 1 = 7.",
    "So close! Check your capital letters and punctuation: use a small x and nothing else on the line, just like 7 x 1 = 7."),
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
