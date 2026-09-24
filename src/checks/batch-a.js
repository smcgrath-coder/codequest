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

// ch1_s3: lines R with the commas that group a number's thousands left out, as f"{seconds:,}" prints them, so 259,200
// reads as one number. A comma counts only when exactly three digits follow it, so "3,72" and "72, 4320" keep theirs.
const NO_COMMAS = String.raw`(lambda R: [re.sub(r'(?<=\d),(?=\d{3}(?!\d))', '', l) for l in R])`;

// ch1_boss: the sentence's pattern with capitals ignored (Python source), and the line of L that it matches.
const BOSS = String.raw`r'(?i)My name is (.+), I am (.+), and I love (.+)'`;
const BOSS_LINE = `next(l for l in L if re.fullmatch(${BOSS}, l))`;

// ch3_r2: a line that looks like one of the two messages, so a slip in one ("You Passed", "Try agian!") still counts and
// is named, while a blank line or a "Score: 85" doesn't count. Not in round 2: a line in between or before, like "Now
// let's try a score of 50", "Let's try again with 50" or "Did you pass?", doesn't count either, so a message has no
// digit, isn't a question, and has "you pass" or "try again" in it, or is short and has pass, try or again in it.
const R2_MSG = String.raw`(lambda l: (lambda z: not re.search(r'\d', l) and not l.rstrip().endswith('?') and bool(re.search('youpass|tryagain', z) or (len(z) <= 12 and re.search('pass|try|again', z))))(re.sub(r'[\W_]+', '', l.lower())))`;

// ch3_r2: true when the first run's messages aren't You passed! and then Try again!, even with capitals, spaces and
// punctuation ignored.
const R2_OFF = `${LOOSE}(list(filter(${R2_MSG}, L))) != ['youpassed', 'tryagain']`;

// ch4_r3: whether line l calls its letter a vowel or a consonant ('?' if neither). The first of the two words counts,
// flipped by a "not" just before it, so "p is not a vowel" and "p is a consonant, not a vowel" are consonants.
const KIND = String.raw`(lambda l: (lambda m: '?' if not m else 'vowel' if (m.group(2).lower() == 'vowel') != bool(m.group(1)) else 'consonant')(re.search(r"(?i)(\bnot\s+(?:an?\s+)?|n[’']t\s+(?:an?\s+)?|\bisnt\s+(?:an?\s+)?)?\b(vowel|consonant)", l)))`;

// ch4_r3: the lines of R that say vowel or consonant, for a word of n letters, so a header like "Checking the letters in
// python" doesn't count, and nor does one that names both, like "Vowel or consonant?" or "Vowels and consonants:". Not in
// round 2: a letter line shows one letter standing alone (and maybe the word "a", as in "p is a consonant"), so a header
// or a summary that shows none or several, like "Finding the vowels in python", "Vowels: a, e, i, o, u" or "Total vowels:
// 1", doesn't count either, unless that leaves other than n lines: "o is a vowel, like a, e, i and u" shows several.
const R3_LINES = String.raw`(lambda R, n: (lambda A: (lambda B: B if len(B) == n else A)([l for l in A if (lambda s: bool(s) and len(s - {'a'}) <= 1)({c.lower() for c in re.findall(r'\b[A-Za-z]\b', l)})]))([l for l in R if re.search(r'(?i)vowel|consonant', re.sub(r'(?i)\b(?:vowels?|consonants?)\s*(?:or|and|/)\s*(?:vowels?|consonants?)\b', ' ', l))]))`;

// ch4_s3: a Trying: line or the Access granted! line, with capitals, spaces and punctuation ignored (as in LOOSE). Not in
// round 2: a Trying line ends with one of the guesses, so a header like "Trying each password..." doesn't count.
const S3_KEEP = String.raw`(lambda l: (lambda z: (z.startswith('trying') and z.endswith(('java', 'ruby', 'python', 'rust'))) or z == 'accessgranted')(re.sub(r'[\W_]+', '', l.lower())))`;
// ch4_s3: true when the first run's kept lines are wrong even with capitals, spaces and punctuation ignored.
const S3_OFF = `${LOOSE}(list(filter(${S3_KEEP}, L))) != ['tryingjava', 'tryingruby', 'tryingpython', 'accessgranted']`;

// ch4_r2, ch4_r5, ch4_boss and grind_3: a line that shows numbers, not one that introduces them ("Countdown:",
// "Remainders of 97:").
const NUM_LINE = String.raw`(lambda l: bool(re.search(r'\d', l)) and not l.rstrip().endswith(':'))`;
// ch2_r2, ch4_r2, ch4_r5, ch4_boss and grind_3: lines R without the ones that introduce or follow the results, like a
// header "Countdown 5 to 1" or "Remainders of 97 divided by 2, 3, 5 and 7", or a closing "Found a number divisible by 7!":
// a line with a letter in it whose layout, with its numbers left out, no other line of R shares. Results printed the same
// way share one ("Odd: 1", "Odd: 3"), and bare numbers have no letters. Not in round 2, where such a line counted as a
// result. Rules read R both with and without these lines, since four results each labeled their own way have no layout
// in common either.
const NO_HEADERS = String.raw`(lambda R: (lambda t: [l for l, s in zip(R, t) if not (re.search('[A-Za-z]', l) and t.count(s) == 1)])([re.sub(r'\d+', '#', l) for l in R]))`;
// grind_3: the lines of L that show remainders. A line whose only number is 97 introduces them too.
const REMAINDER_LINES = String.raw`[l for l in L if ${NUM_LINE}(l) and set(re.findall(r'\d+', l)) != {'97'}]`;
// The numbers on lines R, as text, read two ways: the last number on each line, so labels like "Even: 2" or "T-minus 10"
// are fine, and every number on every line, so a row like 2 4 6 8 10 (print(i, end=" ")) is fine too. A - between two
// digits, as in 5-4-3, separates them and isn't a minus sign.
const NUM_READS = String.raw`(lambda R: (lambda f: [[(f(l) or [''])[-1] for l in R], [x for l in R for x in f(l)]])(lambda l: re.findall(r'(?<![\d.])-?\d+(?:\.\d+)?', l)))`;
// NUM_READS of lines R, and of R without its headers (see NO_HEADERS above).
const ALL_READS = `(lambda R: ${NUM_READS}(R) + ${NUM_READS}(${NO_HEADERS}(R)))`;
// ch4_boss: the lines before LIFTOFF! (found with capitals, spaces and punctuation ignored) and the altitude lines after
// it, and the altitude lines the task asks for. Not in round 2: a line after LIFTOFF! that has words but doesn't say
// altitude, like a closing "We made it to space!", isn't an altitude line, as the countdown allows extra lines too.
const BOSS4 = String.raw`(lambda i: (L[:i], [l for l in L[i + 1:] if l.strip() and ('altitude' in re.sub(r'[\W_]+', '', l.lower()) or not re.search('[A-Za-z]', l))]))(next((k for k, l in enumerate(L) if re.sub(r'[\W_]+', '', l.lower()) == 'liftoff'), len(L)))`;
const ALTITUDES = "['Altitude: 100', 'Altitude: 200', 'Altitude: 300', 'Altitude: 400', 'Altitude: 500']";
// ch4_r5: the lines of L that show the odd numbers: without a header or a closing line (see NO_HEADERS above) when the
// lines left are all printed the same way, as a loop's are, else every line that shows numbers.
const R5_K = String.raw`(lambda K: (lambda H: H if H and len({re.sub(r'\d+', '#', l) for l in H}) == 1 else K)(${NO_HEADERS}(K)))([l for l in L if ${NUM_LINE}(l)])`;
// ch4_r5: the numbers those lines show, as text: every number when they're all on one line, else the last number on each.
const R5_NUMS = `(lambda K: ${NUM_READS}(K)[1 if len(K) == 1 else 0])(${R5_K})`;
// ch4_r2, ch4_r5 and ch2_r2: no print() is given a number typed into the code, like print(5) or print("3.3333"). A correct
// program prints the loop's variable or the calculation itself; text with words in it ("Countdown 5 to 1") is fine. Not
// in round 2: a number with a calculation or a variable after it in the same print() is a label, like the "1." of
// print("1.", 10 + 5) or f"1. {10 + 5}".
const NO_TYPED_NUMBER = String.raw`not any(isinstance(n, ast.Call) and isinstance(n.func, ast.Name) and n.func.id == 'print' and (lambda P: any(isinstance(c, ast.Constant) and not isinstance(c.value, bool) and re.fullmatch(r'[\d\s,.]*\d[\d\s,.]*', str(c.value)) and all(isinstance(d, ast.Constant) for d in P[k + 1:]) for k, c in enumerate(P)))([c for a in n.args for c in (a.values if isinstance(a, ast.JoinedStr) else [a.operand] if isinstance(a, ast.UnaryOp) else [a])]) for n in ast.walk(TREE))`;

// ch3_r1 and ch3_s3: the True/False answers in R. On one line, every one counts (print(a > b, a < b, ...)); on
// several, the last one on each line does, so labels like "a > b: True" are fine and a line with none gives ''.
const BOOLS = String.raw`(lambda R: re.findall(r'\b(?:True|False)\b', R[0]) if len(R) == 1 else [(re.findall(r'\b(?:True|False)\b', l) or [''])[-1] for l in R])`;
// R holds n answers, each True or False. Checked before which ones they are, so each failure gets its own hint.
const nBools = (R, n) => `(lambda B: len(B) == ${n} and '' not in B)(${BOOLS}(${R}))`;

// ch3_s1: whether text s is a header rather than an answer: a question or a line ending in a colon, or one about the
// values (plural), like "Which values are truthy?" or "Let's find the truthy values!". Not in round 2.
const HEADERISH = String.raw`(lambda s: bool(re.search(r'[?:]\s*$', s) or re.search(r'(?i)\bvalues\b', s)))`;
// ch3_s1: the last truthy or falsy word on each line of L that has one, so labels like "0 is falsy" are fine, and so is
// a line with neither, like a "Testing values:" header. "truthy or falsy" together, as in a header, doesn't count, and
// nor does a header (see HEADERISH above).
const TRUTHY_WORDS = String.raw`[w for w in [(re.findall(r'(?i)\b(?:truthy|falsy|falsey)\b', re.sub(r'(?i)\b(?:truthy|falsey|falsy)\s*(?:or|/)\s*(?:truthy|falsey|falsy)\b', ' ', l)) or [''])[-1].lower().replace('falsey', 'falsy') for l in L if not ${HEADERISH}(l)] if w]`;

// ch3_s2: true when the first run's lines aren't minor, boiling and game over, even with capitals, spaces and
// punctuation ignored.
const S2_OFF = `${LOOSE}(L) != ${LOOSE}(['minor', 'boiling', 'game over'])`;

// ch3_boss: whether text t has the message m with no letter, digit or other ! . ? touching it, so "Needs work!" and
// "Great job!!" are near misses of Needs work and Great job!, while "Grade: B - Great job!" and a quoted "Great job!" count.
const MSG_IN = String.raw`(lambda m, t: re.search(r'(?<![\w!.?])' + re.escape(m) + r'(?![\w!.?])', t) is not None)`;

// grind_4: the letter grades in text t, each a capital A-F standing alone. When there's more than one, an A that
// starts a sentence and comes before a lowercase word ("A score of 73 gets a C") is the word "a", not a grade. Not in
// round 2: so is one after a colon, a comma or a dash ("Grade C: A good effort").
const GRADES = String.raw`(lambda t: (lambda g: g if len(g) < 2 else re.findall(r'\b[A-F]\b', re.sub(r'(?m)(^|[.!?:;,]\s+|\s[-–—]\s+)A(?=\s+[a-z])', r'\1', t)))(re.findall(r'\b[A-F]\b', t)))`;

// ch3_boss and grind_4: whether lines R show the letter grade g only as a small letter, alone on a line or after "Grade:"
// or "Your grade is", so print("d") is told about its capital letter instead of its if tests. Not in round 2.
const LOWER_GRADE = String.raw`(lambda R, g: any(re.sub(r'(?i)^\W*(?:your\s+)?(?:letter\s+)?grade(?:\s+is)?\W*', '', l).strip(' .!:-') == g.lower() for l in R) and not re.search(r'\b%s\b' % g, '\n'.join(R)))`;

// grind_5: what line l says about the year: -1 not a leap year, 1 a leap year, 0 neither. grading.py's polarity()
// reads "2023 is a regular year" or "Common year" as neither, and "isn’t" (with a curly ’) as a leap year.
const LEAP = String.raw`(lambda l: -1 if re.search(r"(?i)\b(?:not|no|nope|false|isnt|regular|common|normal|ordinary|non-leap)\b|n[’']t\b", l) else 1 if re.search(r'(?i)\b(?:leap|true|yes)\b', l) else 0)`;

// ch2_s1: PAR(s) reads the text s next to a number, and says True if it calls the number even, False if odd, None if
// neither. The last even/odd word counts, flipped by a "not" just before it ("15 is not even") or a "no"/"false" after
// it ("Is 15 even? No"), so "Is 15 even? No, it is odd" reads as odd.
const PAR = String.raw`(lambda s: (lambda ms: None if not ms else (ms[-1].group(2).lower() == 'even') ^ bool(ms[-1].group(1)) ^ bool(re.search(r'(?i)\b(?:no|false)\b', s[ms[-1].end():])))(list(re.finditer(r"(?i)(\bnot\s+(?:an?\s+)?|n[’']t\s+(?:an?\s+)?|\bisnt\s+(?:an?\s+)?)?\b(even|odd)\b", s))))`;
// ch2_s1: PARITY(n) reads every place the number n is printed, and gives PAR of the text that goes with it: the text
// after it, up to the next of 15, 42 or 7 on that line, or, on a line whose words come first ("Odd: 15", "Even
// number: 42"), the text before it, back to the one before. Not in round 2, which only read the text after it: when
// that text says neither, the text on its other side counts. Headers don't count: "even or odd" (or "odd or even")
// together says neither, and a line that names two of the numbers with no even/odd word between them ("Checking 15,
// 42 and 7 to see which are even!") is about all of them, not an answer. "15 % 2 = 1, so 15 is odd" names only one.
const PARITY = String.raw`(lambda n: [(lambda a, b: b if a is None else a)(${PAR}(p[i - 1] if first else p[i + 1]), ${PAR}(p[i + 1] if first else p[i - 1])) for l in '\n'.join(l for l in re.sub(r'(?i)\b(?:even|odd)\s*(?:or|/)\s*(?:even|odd)\b', ' ', out).split('\n') if not (lambda m: m and not re.search(r'(?i)\b(?:even|odd)\b', m.group(2)))(re.match(r'.*?\b(15|42|7)\b(.*?)\b(?!\1\b)(?:15|42|7)\b', l))).split('\n') for p in [re.split(r'\b(15|42|7)\b', l)] for first in [${PAR}(p[0]) is not None] for i in range(1, len(p), 2) if p[i] == str(n)])`;

// ch2_s2: whether line l shows the text w with no other letter touching it, so "First: C" shows C and "Code" doesn't.
const SHOWS = String.raw`(lambda l, w: re.search(r'(?<![A-Za-z])' + re.escape(w) + r'(?![A-Za-z])', l) is not None)`;

// ch2_s2: lines R that aren't blank, from the first one that shows w, the word three times (or from the start if none
// does), so a header before them doesn't count. Not in round 2.
const MIRROR = `(lambda R, w: (lambda K: K[next((k for k, l in enumerate(K) if ${SHOWS}(l, w)), 0):])([l for l in R if l.strip()]))`;

// grind_7: the answers L shows: its lines, or when there's only one line, the answers on it, split at spaces and commas.
const FIZZ_ROWS = String.raw`(L if len(L) != 1 else re.split(r'[\s,]+', L[0].strip(' ,')))`;
const FIZZ_W = "['1', '2', 'Fizz', '4', 'Buzz', 'Fizz', '7', '8', 'Fizz', 'Buzz', '11', 'Fizz', '13', '14', 'FizzBuzz', '16', '17', 'Fizz', '19', 'Buzz']";

// A % inside a loop, a function or a comprehension works on every number it is given.
const MOD_IN_LOOP = String.raw`any(isinstance(m, ast.BinOp) and isinstance(m.op, ast.Mod) for n in ast.walk(TREE) if isinstance(n, (ast.For, ast.While, ast.FunctionDef, ast.Lambda, ast.ListComp, ast.GeneratorExp)) for m in ast.walk(n))`;

// type() shown by Python itself: called at least once, never on a typed-in value, and no "<class" typed.
const REAL_TYPES = String.raw`calls('type') >= 1 and not any(isinstance(n, ast.Call) and isinstance(n.func, ast.Name) and n.func.id == 'type' and n.args and isinstance(n.args[0], ast.Constant) for n in ast.walk(TREE)) and not any('<class' in s for s in str_consts())`;

// ch3_s1: an if that tests the value itself (`if value:` or `if not value:`), with no == or other comparison. The
// task asks for if/else, so the inline form, print("truthy" if value else "falsy"), counts too.
const TRUTHY_IF = String.raw`(lambda n: isinstance(n, (ast.If, ast.IfExp)) and (not isinstance(n.test, (ast.Compare, ast.BoolOp, ast.UnaryOp)) or (isinstance(n.test, ast.UnaryOp) and isinstance(n.test.op, ast.Not) and not isinstance(n.test.operand, (ast.Compare, ast.BoolOp, ast.UnaryOp)))))`;

// ch2_r2: the lines of L with a digit in them, and if there aren't six, those lines without a header that has a number
// in it (see NO_HEADERS above).
const R2_ANSWERS = `(lambda K: K if len(K) == 6 else ${NO_HEADERS}(K))([l for l in L if re.search(r'\\d', l)])`;

// ch2_r5: whether text t is a table: a line of labels that names subtotal, tax and total, with no numbers, over a line
// that shows the three values (100, 10 and 110, in any order).
const RECEIPT_TABLE = String.raw`(lambda t: (lambda R: any(not re.search(r'\d', R[i - 1]) and re.search(r'(?i)sub', R[i - 1]) and re.search(r'(?i)\btax\b', R[i - 1]) and re.search(r'(?i)total', re.sub(r'(?i)sub\W?total', '', R[i - 1])) and sorted(float(x) for x in re.findall(r'(?<![\d.])\d+(?:\.\d+)?', R[i])) == [10.0, 100.0, 110.0] for i in range(1, len(R))))(t.split('\n')))`;

// grind_1: true when the first run doesn't show the sentence, even with capitals, spaces and punctuation ignored.
const G1_UNSEEN = `${LOOSE}([f"The {ns.get('animal')} ate {ns.get('number')} {ns.get('food')}s"])[0] not in ${LOOSE}(L)`;

export const BATCH_A = {
  // ── Chapter 1: The Terminal ──
  ch1_r1: { output: [{ expr: "lines(['Hello, World!'])" }] },
  ch1_r2: { output: [{ expr: "lines(['I am a coder','I am brave','I am ready'])" }] },
  ch1_r3: {
    output: [{ expr: "lines(['Comments help me remember'])" }],
    // rules_a.py had len(new_comments()) >= 1, which a bare # (or # and spaces) passed: it needs words, in any
    // alphabet (# Эта программа печатает сообщение is a comment too): [^\W\d_] is a letter of any script.
    concepts: [{ expr: String.raw`any(re.search(r'[^\W\d_]', c) for c in new_comments())`, hint: "Add a comment of your own that starts with # and says what your program does (the one that was already there doesn't count)." }],
  },
  ch1_r4: {
    // The task only says "Then print it", so a label around the name ("My hero is Luna", f"Hero: {hero_name}") is
    // fine. The variable is checked first, so a kid who named it something else is told that, not to print the name.
    output: [
      { expr: "isinstance(ns.get('hero_name'), str) and ns['hero_name'].strip() != ''", hint: "Make a variable called hero_name and put a name inside it, in quotes." },
      // Not in round 2: capitals are ignored, so print(hero_name.upper()) prints it too.
      { expr: "ns['hero_name'].strip().lower() in out.lower()", hint: "Print the name that's stored in hero_name." },
    ],
    // Only once hero_name holds a name, as the first output check asks: before that, rerun() has nothing to change.
    // rerun() can't change `hero_name: str = "Luna"` either (it only replaces a plain `name = ...`), so there the code
    // is read instead, as for `a, b = 15, 27` (see unpacked above). Not in round 2: every `hero_name = ...` is replaced
    // (all=True), so a kid who changed their mind (hero_name = "Luna", then hero_name = "Nova") prints Zorp too.
    probes: [{ expr: "not (isinstance(ns.get('hero_name'), str) and ns['hero_name'].strip()) or 'zorp' in '\\n'.join(rerun({'hero_name': \"'Zorp'\"}, all=True)[0]).lower() or " + unpacked(['hero_name']), hint: "Print the hero_name variable, with no quotes around it, instead of typing the name." }],
  },
  ch1_r5: {
    // rules_a.py wanted exactly 42, which failed print("The sum is", a + b). The task only says to print the sum,
    // so 42 printed anywhere is enough: print(a + b, "is the sum of", a, "and", b) and a line each for a, b and
    // the sum are fine too. The rerun below catches a typed 42.
    output: [{ expr: "nums([42])", hint: "Print the sum of a and b. If the answer looks strange, make sure a and b hold numbers, with no quotes around them." }],
    probes: [
      // The values a and b end with, or else the ones their first top-level `a = ...` and `b = ...` give them, since
      // a += b; print(a) is a fine way to print the sum and leaves a at 42.
      { expr: "(ns.get('a') == 15 and ns.get('b') == 27) or all((lambda v: isinstance(v, ast.Constant) and not isinstance(v.value, bool) and v.value == w)(next((n.value for n in TREE.body if isinstance(n, ast.Assign) and any(isinstance(t, ast.Name) and t.id == k for t in n.targets)), None)) for k, w in (('a', 15), ('b', 27)))", hint: "Make two number variables: a should be 15 and b should be 27." },
      // Reruns with 100 and 23, not rules_a.py's 1 and 2, since the sum now only has to appear somewhere and
      // 123 is less likely than 3 to turn up in a label. `a, b = 15, 27` can't be rerun (see unpacked above), so
      // there the code must add a and b themselves: a typed 15 + 27 passed when any + was enough.
      { expr: `nums([123], L=rerun({'a': '100', 'b': '23'})[0]) or (${unpacked(['a', 'b'])} and ${ADDS_A_B} and not any(isinstance(n, ast.Constant) and re.search(r'\\b42\\b', str(n.value)) for n in ast.walk(TREE)))`, hint: "Let Python do the adding: print a + b instead of typing the answer." },
    ],
  },
  ch1_r6: {
    // Other lines, like a "Pizza is the best!" after it or the question an input() asks, are fine: the task only asks
    // for the sentence (as in ch1_boss). The lesson's classic slip, the f left off, prints the braces, so it's named first.
    // Not in round 2: the food itself may be in any capitals, so print(f"I love {food.upper()} so much!") passes, and the
    // capitals hint only means I love and so much!.
    output: [
      { expr: String.raw`not re.search(r'\{\s*food\s*\}', out)`, hint: "Put an f just before the opening quote, so Python swaps {food} for the food stored in it." },
      { expr: "(lambda T: any(l.startswith('I love ') and l.endswith(' so much!') and l.lower() == T for l in L) or not any(l.lower() == T for l in L))(f\"I love {ns.get('food')} so much!\".lower())", hint: "So close! Check your capital letters: the task writes I love with a capital I, and so much! in small letters." },
      { expr: "(lambda T: any(l.startswith('I love ') and l.endswith(' so much!') and l.lower() == T for l in L))(f\"I love {ns.get('food')} so much!\".lower())", hint: "Print I love, then your food, then so much! on one line." },
    ],
    concepts: [
      { expr: "fstrings() >= 1", hint: "This room is about f-strings. Put an f before the quotes and your variable in {curly braces}." },
      // Not in rules_a.py: print(f"I love", food, "so much!") is an f-string with no {}, and passed. So did
      // print(f"{sentence}") with the sentence glued together by +, so the {} must hold food itself (as in ch2_r4).
      { expr: "any(isinstance(n, ast.FormattedValue) and any(isinstance(m, ast.Name) and m.id == 'food' for m in ast.walk(n.value)) for n in ast.walk(TREE))", hint: "Put {food} inside the quotes of your f-string, so Python fills in the food for you." },
    ],
    probes: [
      { expr: "isinstance(ns.get('food'), str) and ns['food'].strip() != ''", hint: "Make a variable called food and put your favorite food inside it, in quotes." },
      // Not in round 2: every `food = ...` is replaced (all=True), so food = "pizza" and then food = "sushi" is fine. And
      // only once the first run shows the sentence, with capitals, spaces and punctuation ignored: otherwise the output
      // check has already named the problem, and a wrong line isn't also blamed on a typed food.
      { expr: `${LOOSE}([f"I love {ns.get('food')} so much"])[0] not in ${LOOSE}(L) or 'ilovetacossomuch' in ${LOOSE}(rerun({'food': "'tacos'"}, all=True)[0])`, hint: "Put {food} in your f-string instead of typing the food, so the sentence changes when food does." },
    ],
  },
  ch1_s1: {
    output: [
      // Two ways to get a space wrong, each with its own hint: pieces split by commas (print() puts a space between
      // them), or a space typed into the one string, as in "red\n Violets".
      { expr: "(lambda W: L == W or [''.join(l.split()) for l in L] != [''.join(w.split()) for w in W] or not any(isinstance(n, ast.Call) and isinstance(n.func, ast.Name) and n.func.id == 'print' and len(n.args) >= 2 and not n.keywords for n in ast.walk(TREE)))(['Roses are red', 'Violets are blue', 'Python is fun'])", hint: "So close! Some of your lines have an extra space. print() puts a space between the things you give it, so keep all the text in one string, with \\n where each new line starts." },
      spacing(['Roses are red', 'Violets are blue', 'Python is fun'], "So close! Some of your lines have an extra or missing space: check the spaces between words, and put nothing between each \\n and the next line's first word."),
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
    // Other lines, like a "Have fun!" after it or the question an input() asks, are fine: the task only asks for the line.
    output: [
      { expr: "(lambda Ts: any(T in L for T in Ts) or not any(l.lower() == T.lower() for l in L for T in Ts))([f\"{ns.get('greeting')}, {ns.get('name')}! Welcome to CodeQuest.\", f\"Hello, {ns.get('name')}! Welcome to CodeQuest.\"])", hint: "So close! Check your capital letters: the task writes Hello, Welcome and CodeQuest with capitals." },
      { expr: "f\"{ns.get('greeting')}, {ns.get('name')}! Welcome to CodeQuest.\" in L or f\"Hello, {ns.get('name')}! Welcome to CodeQuest.\" in L", hint: "Check the pieces you glue together: the comma, the spaces, the ! and the period at the end all have to be there." },
    ],
    concepts: [
      { expr: "fstrings() == 0", hint: "No f-strings in this room: join the pieces with + instead." },
      // message += name glues with + too.
      { expr: "binop('Add') + sum(isinstance(n, ast.AugAssign) and isinstance(n.op, ast.Add) for n in ast.walk(TREE)) >= 1", hint: "Use the + sign to glue your strings together." },
    ],
    probes: [
      // Not in round 2: greeting may start as "Hello" and grow later (greeting += ", "), so its first top-level
      // `greeting = ...` counts too, as ch1_r5 does for a and b.
      { expr: "(ns.get('greeting') == 'Hello' or (lambda v: isinstance(v, ast.Constant) and v.value == 'Hello')(next((n.value for n in TREE.body if isinstance(n, ast.Assign) and any(isinstance(t, ast.Name) and t.id == 'greeting' for t in n.targets)), None))) and isinstance(ns.get('name'), str) and ns['name'].strip() != ''", hint: "Make greeting hold just \"Hello\", with no comma or space inside it, and make name hold any name you like." },
      { expr: `'hellozedwelcometocodequest' in ${LOOSE}(rerun({'name': "'Zed'"})[0])`, hint: "Join your greeting and name variables with +, instead of typing the name into the text." },
      // Not in rules_a.py: greeting = "Hello" set but a typed "Hello" + ", " + name + ... passed.
      { expr: `'hizedwelcometocodequest' in ${LOOSE}(rerun({'greeting': "'Hi'", 'name': "'Zed'"})[0])`, hint: "Use your greeting variable in the line too, instead of typing Hello into the text." },
    ],
  },
  ch1_s3: {
    // Split in three, so a kid who printed four numbers with one wrong is told that, not to print all four.
    // Not in round 2: the numbers are read with the commas of f"{seconds:,}" left out (see NO_COMMAS above), so
    // 259,200 is one number.
    output: [
      { expr: String.raw`len(re.findall(r'-?\d+(?:\.\d+)?', '\n'.join(${NO_COMMAS}(L)))) >= 4`, hint: "Print all four values: days, hours, minutes and seconds." },
      { expr: `numset([3, 72, 4320, 259200], L=${NO_COMMAS}(L))`, hint: "One of your numbers isn't right yet. Remember: a day has 24 hours, an hour has 60 minutes and a minute has 60 seconds." },
      { expr: `nums([3, 72, 4320, 259200], L=${NO_COMMAS}(L))`, hint: "Print the four values in order: days, then hours, then minutes, then seconds." },
      { expr: "bool(re.search(r'(?i)h(ou)?r', out) and re.search(r'(?i)min', out) and re.search(r'(?i)sec', out))", hint: "Put a label next to each number, like hours, minutes or seconds, so we know what it means." },
    ],
    concepts: [
      { expr: "fstrings() >= 1", hint: "Print your results with an f-string: an f before the quotes and each variable in {curly braces}." },
      // Not in rules_a.py: print(f"Days:", days) and so on, with no {}, passed the f-string check.
      { expr: "count(ast.FormattedValue) >= 4", hint: "Put each of the four values inside {curly braces} in your f-strings, so Python fills them in." },
    ],
    probes: [{ expr: `nums([1, 24, 1440, 86400], L=${NO_COMMAS}(rerun({'days': '1'})[0]))`, hint: "Work out hours from days, minutes from hours and seconds from minutes, so the whole chain changes when days does." }],
  },
  ch1_boss: {
    // Other lines, like a print("Hello!") first, are fine: the task only asks for the sentence. It is found with
    // capitals ignored, so a slip in them gets the second check's hint, and the probes still find the sentence.
    output: [
      { expr: `sum(bool(re.fullmatch(${BOSS}, l)) for l in L) == 1`, hint: "Print one sentence that follows the pattern, commas and all: My name is ___, I am ___, and I love ___" },
      { expr: "any(re.fullmatch(r'My name is (.+), I am (.+), and I love (.+)', l) for l in L)", hint: "So close! Check your capital letters: write the words around your blanks just like the task, where only My and the two I's start with a capital." },
    ],
    concepts: [
      { expr: "fstrings() >= 1", hint: "Use an f-string: an f before the quotes and your variables in {curly braces}." },
      // Not in rules_a.py: f"My name is Alex, ..." with the values typed in passed every other check,
      // because the probe only asks that each value is also stored in some variable. The {} must hold three
      // different variables of the kid's, or {name} twice (and game never used) passes too.
      { expr: "count(ast.FormattedValue) >= 3 and len({m.id for n in ast.walk(TREE) if isinstance(n, ast.FormattedValue) for m in ast.walk(n.value) if isinstance(m, ast.Name) and m.id in ns and not callable(ns[m.id])}) >= 3", hint: "Put each of your three variables inside its own {curly braces} in the f-string, instead of typing their values." },
    ],
    // With three {variables} already required, this mostly fails on extra text in a blank that the
    // output regex's (.+) let through, like "{age} years old", "{game}!" or "{name} ," (a space before the comma), so
    // the hint names that.
    probes: [
      { expr: `all(any(str(v) == cap for k, v in ns.items() if not k.startswith('__')) for cap in re.fullmatch(${BOSS}, ${BOSS_LINE}).groups())`, hint: "Fill each ___ blank with just one variable in {curly braces}, with no extra words, spaces or punctuation around it, not even at the end." },
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
    // sentence that already reads right. Other lines, like a "Yum!" after it or the questions input() asks, are fine:
    // the task only asks for the sentence.
    output: [
      { expr: "all(k in ns for k in ('animal', 'food', 'number'))", hint: "Make three variables called animal, food and number." },
      { expr: "(lambda T: T in L or not any(l.lower() == T.lower() for l in L))(f\"The {ns.get('animal')} ate {ns.get('number')} {ns.get('food')}s\")", hint: "So close! Check your capital letters: the sentence starts with a capital T, and the rest is written just like the task." },
      { expr: "f\"The {ns.get('animal')} ate {ns.get('number')} {ns.get('food')}s\" in L", hint: "Print one line: The, your animal, ate, your number, then your food with an s on the end." },
    ],
    // The reruns only count once the three variables exist, as the first output check asks: before that, rerun()
    // has nothing to change. Both also accept `animal, food, number = ...` that uses all three (see unpacked above).
    // They use values a kid is unlikely to pick (yak, kiwi, 41), and others (emu, plum, 86) if the kid picked those:
    // rules_a.py's dog, bone and 2 are likely picks, and a typed "dog" then passed with animal = "dog". Not in round 2:
    // they only count once the first run shows the sentence, with capitals, spaces and punctuation ignored (G1_UNSEEN is
    // true when it doesn't): otherwise the output check has already named the wrong word, as in "The cat eat 5 fishs",
    // and it isn't also blamed on typed words.
    probes: [
      { expr: `not all(k in ns for k in ('animal', 'food', 'number')) or ${G1_UNSEEN} or (lambda a: any(r.startswith('the' + a + 'ate') for r in ${LOOSE}(rerun({'animal': repr(a)})[0])))('yak' if str(ns['animal']).lower() != 'yak' else 'emu') or ${unpacked(['animal', 'food', 'number'])}`, hint: "Use your variables in the sentence instead of typing the words, so it changes when they do." },
      // Not in rules_a.py: the rerun above only changes animal, so typing the food and number passed.
      // number goes in as text, so a program that joins it with + still works.
      { expr: `not all(k in ns for k in ('animal', 'food', 'number')) or ${G1_UNSEEN} or (lambda a, f, n: 'the' + a + 'ate' + n + f + 's' in ${LOOSE}(rerun({'animal': repr(a), 'food': repr(f), 'number': repr(n)})[0]))('yak' if str(ns['animal']).lower() != 'yak' else 'emu', 'kiwi' if str(ns['food']).lower() != 'kiwi' else 'plum', '41' if str(ns['number']) != '41' else '86') or ${unpacked(['animal', 'food', 'number'])}`, hint: "Use all three variables in the sentence, food and number too, instead of typing them." },
    ],
  },

  // ── Chapter 2: The Vault ──
  ch2_r1: {
    // rules_a.py wanted exactly three <class ...> lines. The task only says to print type() of each, so
    // labels ("word is <class 'str'>"), all three on one line and any order are fine.
    output: [{ expr: "all(\"<class '%s'>\" % t in out for t in ('str', 'int', 'float'))", hint: "Print type() of word, whole and decimal, and check that each variable holds the right kind of value." }],
    probes: [
      { expr: "type(ns.get('word')) is str and type(ns.get('whole')) is int and type(ns.get('decimal')) is float", hint: "word should hold text in quotes, whole a whole number like 7, and decimal a number with a dot like 2.5." },
      // Not in rules_a.py: typing the three <class ...> lines by hand passed, since the values are free. The rerun
      // gives each variable the next one's kind of value, so each <class ...> the first run showed must change to match.
      { expr: String.raw`(lambda f: [{'str': 'int', 'int': 'float', 'float': 'str'}.get(c, c) for c in f(out)] == f('\n'.join(rerun({'word': '7', 'whole': '2.5', 'decimal': "'x'"})[0])))(lambda t: re.findall(r"<class '(\w+)'>", t))`, hint: "Print type() of each of your variables, instead of typing what it says." },
    ],
  },
  ch2_r2: {
    // Split in two so a kid with six lines and one wrong answer is told that, not to print six lines.
    // Not in round 2, which wanted exactly six lines: the answers are the lines with a digit in them (see R2_ANSWERS above),
    // so a header like "Number Power results:" or a blank line is fine.
    output: [
      { expr: `len(${R2_ANSWERS}) == 6`, hint: "Print six lines, one answer on each, in the same order as the task." },
      // rules_a.py's nums_per_line takes any number on the line, so a label's numbers hid a wrong answer:
      // print("10 - 5 =", 5 - 10) prints 10 - 5 = -5. The answer is the last number on its line.
      { expr: String.raw`all((lambda f: bool(f) and abs(float(f[-1]) - v) <= 1e-6 * max(1, abs(v)))(re.findall(r'-?\d+(?:\.\d+)?', l)) for l, v in zip(${R2_ANSWERS}, [15, 5, 50, 10/3, 3, 16]))`, hint: "One of your six answers isn't right yet. Check that each line uses the same numbers and math symbol (+ - * / // or **) as the task, with the answer at the end of the line." },
    ],
    // One check per sign, so int(10 / 3) for 10 // 3, or ^ for **, is told which sign is missing. 4 ** 2 for 2 ** 4 can't
    // be caught: it prints the same 16, and base ** exp with variables is just as right.
    concepts: [
      ...[['Add', '+', '10 + 5'], ['Sub', '-', '10 - 5'], ['Mult', '*', '10 * 5'], ['Div', '/', '10 / 3'], ['FloorDiv', '//', '10 // 3'], ['Pow', '**', '2 ** 4']].map(([op, sign, calc]) =>
        ({ expr: `binop('${op}') >= 1`, hint: `Write ${calc} in your code with the ${sign} sign, so Python works out that answer itself.` })),
      // Not in rules_a.py: a typed 3.3333333333333335 passed, with a stray x = 10 / 3 to show a /.
      { expr: NO_TYPED_NUMBER, hint: "Put each calculation itself inside print(), instead of typing its answer." },
    ],
  },
  ch2_r3: {
    // rules_a.py wanted the three results alone on their lines. The task shows no exact output and doesn't ask for
    // one line each, so a label around each one ("Upper: THE VAULT AWAITS"), all three in one print() (as ch2_r1
    // allows) and an extra line are fine. Not in round 2, which wanted the task's order: the task lists the three but
    // doesn't say in what order to print them, so len(message) first is fine too, as ch2_r1 allows any order.
    output: [
      { expr: "'THE VAULT AWAITS' in out", hint: "Print message.upper(), so the message shows in capital letters." },
      { expr: "'the quest awaits' in out", hint: "Print message.replace(\"vault\", \"quest\") too, so the word vault is swapped for quest." },
      { expr: String.raw`re.search(r'(?<![\d.])16(?![\d.])', out) is not None`, hint: "Print len(message) too, so Python counts the characters in the message." },
    ],
    // Each result the first run showed must change with message. One it didn't show isn't looked for, so a slip the
    // output checks already named (a capital Q in quest) isn't also blamed on typed answers.
    probes: [{ expr: String.raw`(lambda t: ('THE VAULT AWAITS' not in out or 'A VAULT B' in t) and ('the quest awaits' not in out or 'a quest b' in t) and (not re.search(r'(?<![\d.])16(?![\d.])', out) or re.search(r'(?<![\d.])9(?![\d.])', t) is not None))('\n'.join(rerun({'message': "'a vault b'"})[0]))`, hint: "Use .upper(), .replace() and len() on the message variable instead of typing the results." }],
  },
  ch2_r4: {
    // Other lines, like a "Cracking the lock..." before it, are fine: the task only asks for the one line, which is
    // found with capitals, spaces and punctuation ignored (see keptLines above). An f left off prints {code} itself.
    output: keptLines(String.raw`(lambda l: re.sub(r'[\W_]+', '', l.lower()).startswith('thecodeis'))`, ['The code is 57'], [
      [String.raw`not re.search(r'\{\s*code\s*\}', out)`, "Put an f just before the opening quote, so Python swaps {code} for the number stored in it."],
      ["len(K) >= 1", "Print The code is and then your code, all on one line."],
      [`${LOOSE}(K) == ['thecodeis57']`, "The number after The code is isn't right yet, so check your calculation against the task, with the same numbers and signs."],
    ], "So close! Check the spaces: one space between the words, and one before the number.",
    "So close! Check your capital letters and punctuation: The starts with a capital T, and nothing else goes on the line, not even a period."),
    concepts: [
      { expr: "fstrings() >= 1", hint: "Print the answer with an f-string: an f before the quotes and the variable in {curly braces}." },
      { expr: "binop('FloorDiv') >= 1 and binop('Mult') >= 1", hint: "Type the whole calculation into your code, with * and //, and let Python work out the answer." },
      // Not in rules_a.py: f"The code is 57" (an f-string with the answer typed in) passed every check,
      // and so did f"The code is {57}", so the {} must hold the code variable.
      { expr: "any(isinstance(n, ast.FormattedValue) and any(isinstance(m, ast.Name) and m.id == 'code' for m in ast.walk(n.value)) for n in ast.walk(TREE))", hint: "Put the variable code inside {curly braces} in your f-string, so Python fills in the number for you." },
    ],
    // Split in two, so a code variable holding the wrong answer isn't told to make one.
    probes: [
      { expr: "'code' in ns", hint: "Store the answer in a variable called code, then print it." },
      // Not in round 2: code = str(...) of the task's calculation prints the same line, so the text '57' is fine too.
      { expr: "ns['code'] == 57 or ns['code'] == '57'", hint: "Check the calculation you store in code: it needs the same numbers and signs as the task, (17 * 3) + (42 // 5) - 2." },
    ],
  },
  ch2_r5: {
    // Not in round 2, which wanted subtotal, tax and total in that order: the task only says to print each labeled value,
    // so any order is fine, and so is a table, a row of labels over a row of the three numbers.
    output: [
      { expr: "numset([100, 10.0, 110.0])", hint: "Print subtotal, tax and total, and check that each one uses the formula from the task." },
      // rules_a.py wanted a letter on every line, which failed a receipt with a ---- divider or a blank
      // line, and a later version wanted 3 lines, which failed all three labeled values on one line. So:
      // find 100, 10 and 110 in order, and each needs a word right before or after it on its own line (between it
      // and its neighbours), which fails "Subtotal: 100 10.0 110.0". Only its own line counts, or the next line's
      // "Tax:" labels a bare 100 above it; a line holding just a label, like "Subtotal:" above the 100, counts too.
      // Decimals are rounded to 6 places first, so total = subtotal * 1.1 (110.00000000000001) isn't told to add
      // labels it has; the probe below names its formula.
      // Not in round 2: the three are found in any order (each order is tried), or as a table (see RECEIPT_TABLE above).
      { expr: String.raw`(lambda t: any((lambda m: bool(m) and all(re.search('[A-Za-z]', m.group(i).rsplit('\n', 1)[-1] + m.group(i + 1).split('\n', 1)[0]) or (m.group(i).count('\n') >= (1 if i == 1 else 2) and re.fullmatch(r'\D*[A-Za-z]\D*', m.group(i).split('\n')[-2])) for i in (1, 2, 3)))(re.search(r'^(.*?)(?<![\d.])%s(?:\.0+)?(?![\d.])(.*?)(?<![\d.])%s(?:\.0+)?(?![\d.])(.*?)(?<![\d.])%s(?:\.0+)?(?![\d.])(.*)$' % p, t, re.S)) for p in [('100', '10', '110'), ('100', '110', '10'), ('10', '100', '110'), ('10', '110', '100'), ('110', '100', '10'), ('110', '10', '100')]) or ${RECEIPT_TABLE}(t))(re.sub(r'\d+\.\d+', lambda f: ('%.6f' % float(f.group())).rstrip('0').rstrip('.'), out))`, hint: "Put a label next to each number, like Subtotal:, so the shopper knows what it is." },
    ],
    probes: [
      { expr: "ns.get('subtotal') == 100 and ns.get('tax') == 10.0 and ns.get('total') == 110.0", hint: "Make the variables subtotal, tax and total, using the formulas from the task." },
      // rules_a.py only changed price, so subtotal = price * 4 (quantity typed) passed. Both change here.
      { expr: "numset([30, 3.0, 33.0], L=rerun({'price': '10', 'quantity': '3'})[0])", hint: "Work out each value from price and quantity instead of typing the numbers, so the calculator works for any price and quantity." },
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
    concepts: [
      { expr: `binop('Mod') >= 3 or ${MOD_IN_LOOP}`, hint: "Use % 2 on each of the three numbers, so Python works out every answer." },
      // Not in round 2: 7 % 3 == 0 for 7 % 2 == 0 happens to say odd too, and passed. The task says to use % 2, so no %
      // may divide by another typed number (a % that fills in text, as in "%d is odd" % n, isn't one).
      { expr: "not any(isinstance(n, ast.BinOp) and isinstance(n.op, ast.Mod) and not (isinstance(n.left, (ast.Constant, ast.JoinedStr)) and isinstance(getattr(n.left, 'value', ''), str)) and isinstance(n.right, ast.Constant) and not isinstance(n.right.value, bool) and n.right.value != 2 for n in ast.walk(TREE))", hint: "Check each % in your code: to test for even or odd, divide by 2 every time." },
    ],
  },
  ch2_s2: {
    // rules_a.py wanted each result alone on its line. The task shows no exact output, so a label like "First: C" is
    // fine, as in ch2_r3: SHOWS(l, w) is true when line l shows w with no other letters touching it, so "First: C" shows
    // C and "Code" doesn't. The divider is the task's own print("-" * 20), so it is exact. One check per line, each
    // with its own hint. Not in round 2, which wanted exactly four lines: the four are read from the line that shows the
    // word three times (see MIRROR above), so a header before them, a blank line or a closing line after them is fine.
    output: [
      { expr: `len(${MIRROR}(L, 'CodeCodeCode')) >= 4`, hint: "Print four lines, one print() each: the word three times, its first letter, its last letter, then the divider." },
      ...[['CodeCodeCode', "Check your first line: word * 3 shows the word three times in a row."], ['C', "Check your second line: word[0] is the first letter, because Python starts counting at 0."], ['e', "Check your third line: word[-1] is the last letter of the word."]].map(([w, hint], k) =>
        ({ expr: `${SHOWS}(${MIRROR}(L, 'CodeCodeCode')[${k}], '${w}')`, hint })),
      { expr: `${MIRROR}(L, 'CodeCodeCode')[3] == '-' * 20`, hint: "Check your divider: print(\"-\" * 20) prints 20 dashes and nothing else." },
    ],
    // Each line the first run got right must change with word; one it got wrong was already named by the output
    // check, so it isn't also blamed on typed letters.
    probes: [{ expr: `(lambda K, R: len(R) >= 4 and all(${SHOWS}(r, wr) for l, w, r, wr in zip(K, ['CodeCodeCode', 'C', 'e'], R, ['RobotRobotRobot', 'R', 't']) if ${SHOWS}(l, w)))(${MIRROR}(L, 'CodeCodeCode'), ${MIRROR}(rerun({'word': "'Robot'"})[0], 'RobotRobotRobot'))`, hint: "Use word with *, [0] and [-1] instead of typing the letters, so it works for any word." }],
  },
  ch2_s3: {
    // rules_a.py wanted the two type lines alone. The task says to print them "to prove they're different", so a
    // label around each ("price_text is <class 'str'>") is fine, and so are both on one line, as ch2_r1 allows, which
    // a lines([...]) check can't allow. So the first line's slips are named here: spaces, then capitals and symbols.
    output: [
      { expr: String.raw`(lambda T: L[:1] == [T] or not L or ''.join(L[0].split()) != ''.join(T.split()))('3 items at $49 = $147')`, hint: "So close! Check the spaces in your first line, so it's spaced just like 3 items at $49 = $ in the task." },
      { expr: `(lambda T: L[:1] == [T] or not L or ${LOOSE}(L[:1]) != ${LOOSE}([T]))('3 items at $49 = $147')`, hint: "So close! Check your first line's capital letters and symbols: it needs small letters, both $ signs and the = sign, just like the task." },
      { expr: "L[:1] == ['3 items at $49 = $147']", hint: "Your first line should be 3 items at $49 = $ and then your total. If the total looks strange, check that you used int() on price_text before multiplying." },
      // Not in round 2, which wanted the type lines right after the first: the type lines are the ones that show a
      // <class ...>, so a blank line or another line between or after them is fine. Split in three, so price_text
      // turned into a number (price_text = int(price_text)) is told that, not to print the types it printed.
      { expr: String.raw`(lambda T: len(T) <= 2 and len(re.findall(r"<class '\w+'>", '\n'.join(T))) == 2)([l for l in L[1:] if '<class' in l])`, hint: "After that line, print type(price_text) and then type(total), so Python shows what kind of value each one holds." },
      { expr: String.raw`re.findall(r"<class '(\w+)'>", '\n'.join(L[1:])) != ['int', 'int']`, hint: "price_text should still hold text, so use int(price_text) in your calculation instead of storing the number back in price_text." },
      { expr: String.raw`re.findall(r"<class '(\w+)'>", '\n'.join(L[1:])) != ['str', 'str']`, hint: "total should hold a whole number, not text, so that type(total) shows <class 'int'>." },
      { expr: String.raw`re.findall(r"<class '(\w+)'>", '\n'.join(L[1:])) == ['str', 'int']`, hint: "Print type(price_text) first and then type(total), so Python shows the text's type and then the number's." },
    ],
    // Not in rules_a.py: the two type lines typed by hand, or type("49") and type(147), passed.
    concepts: [{ expr: REAL_TYPES, hint: "Print type(price_text) and type(total), so Python shows each variable's type, instead of typing it." }],
    probes: [
      { expr: "type(ns.get('total')) is int", hint: "Store your answer in a variable called total, and make it a whole number by using int() on price_text." },
      // Split from round 2's check, so a total worked out wrong (int(price_text) + 3) isn't told to use int().
      { expr: "ns['total'] == 147", hint: "Check how you work out total: it's price_text turned into a number, then multiplied by 3." },
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
    // "Print each with its type" doesn't say which comes first, so print(type(a), a) is fine too.
    output: [{ expr: "has('42', \"<class 'int'>\", '3.14', \"<class 'float'>\", '100', \"<class 'str'>\") or has(\"<class 'int'>\", '42', \"<class 'float'>\", '3.14', \"<class 'str'>\", '100')", hint: "Print each converted value together with its type(), in the order from the task." }],
    concepts: [
      { expr: "calls('int') >= 1 and calls('float') >= 1 and calls('str') >= 1", hint: "Do the converting with int(), float() and str()." },
      // Not in rules_a.py: converting, then typing "<class 'int'>" and the others as text, passed.
      { expr: REAL_TYPES, hint: "Show each value's type with type(), instead of typing <class ...> yourself." },
    ],
  },
  grind_3: {
    // The task doesn't ask for one per line, so all four on one line passes too, and so does a header line before
    // them, like "Remainders of 97:" (see REMAINDER_LINES above).
    // Split in two, so four lines with a wrong remainder are told that, not how to lay the lines out. Not in round 2:
    // each check reads the lines both with and without a header that has other numbers in it, like "Remainders of 97
    // divided by 2, 3, 5 and 7" (see NO_HEADERS above).
    output: [
      { expr: String.raw`any((lambda K: len(K) == 4 or (len(K) == 1 and len(re.findall(r'-?\d+(?:\.\d+)?', K[0])) >= 4))(K) for K in (${REMAINDER_LINES}, ${NO_HEADERS}(${REMAINDER_LINES})))`, hint: "Print the four remainders, for 2, 3, 5 and 7, in that order." },
      // The last number on each line is its remainder, as in ch2_r2: nums_per_line took any number on the line, so a
      // divisor typed wrong, 97 % 6 = 1 for 97 % 7, passed on its label's 6.
      { expr: String.raw`any((lambda K: (len(K) == 4 and all(x and float(x) == v for x, v in zip(${NUM_READS}(K)[0], [1, 1, 2, 6]))) or (len(K) == 1 and nums([1, 1, 2, 6], L=K)))(K) for K in (${REMAINDER_LINES}, ${NO_HEADERS}(${REMAINDER_LINES})))`, hint: "One of your remainders isn't right yet. Check that each line uses 97, the % sign and the right number: 2, then 3, then 5, then 7." },
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
    // Not in rules_a.py or round 1: no run had a above 10 or b at 4, so a >= 10 for a == 10, or b >= 4 for b >= 5,
    // passed. a = 12, b = 4 catches both. The first probe's hint names a and b, since a != 5 for a != b never changes
    // either, and that kid typed no True or False.
    probes: [
      // Not in round 2: only once the first run's answers are right, like the probe after it, so a wrong comparison
      // (a == "10") isn't also told that it typed True or False.
      { expr: `${BOOLS}(L) != ['True', 'False', 'True', 'True', 'True'] or (lambda runs: all(len(set(c)) > 1 for c in zip(*runs)))([${BOOLS}(L)] + [${BOOLS}(rerun({'a': a, 'b': b})[0]) for a, b in [('3', '5'), ('3', '3'), ('7', '9'), ('12', '4')]])`, hint: "Write each comparison with a and b just like the task, instead of typing True or False, so every answer changes when a and b do." },
      // Only once the first run's answers are right: otherwise the output check has already named the wrong one.
      { expr: `${BOOLS}(L) != ['True', 'False', 'True', 'True', 'True'] or all(${BOOLS}(rerun({'a': a, 'b': b})[0]) == want for a, b, want in [('3', '5', ['False', 'True', 'False', 'True', 'True']), ('3', '3', ['False', 'False', 'False', 'False', 'False']), ('7', '9', ['False', 'True', 'False', 'True', 'True']), ('12', '4', ['True', 'False', 'False', 'True', 'False'])])`, hint: "Check each comparison's letters, numbers and signs against the task: > is not the same as >=, and < is not the same as <=." },
    ],
  },
  ch3_r2: {
    // Only the lines that look like one of the two messages count (see R2_MSG above), so a print() between the two
    // checks and a "Score: 85" before each are fine (see keptLines above).
    output: keptLines(R2_MSG, ['You passed!', 'Try again!'], [
      ["len(K) == 2", "Do the check twice, once with score = 85 and again after score = 50, so your program prints You passed! and then Try again!"],
      [`${LOOSE}(K[:1]) == ['youpassed']`, "Check your first if/else: a score of 85 is 70 or more, so it should print You passed!"],
      [`${LOOSE}(K[1:]) == ['tryagain']`, "Check your second if/else: a score of 50 is under 70, so it should print Try again!"],
    ], "So close! Check the spaces in your messages: they should look just like You passed! and Try again! in the task.",
    "So close! Check your capital letters and punctuation: You passed! and Try again! each have one capital letter and an exclamation mark at the end."),
    // The first run shows only the first check's You passed! and the second's Try again!, so the loose probes (see
    // LOOSE above) come first, then the exact one names a slip in the messages the first run didn't print. A rerun
    // that changes one score is only read on the line that score prints, since the other line is the first run's.
    // Not in round 2: they only count once the first run's two messages are right with capitals, spaces and punctuation
    // ignored (R2_OFF is true when they aren't): otherwise the output check has already named the wrong one, and a
    // second check with its messages swapped isn't also told to give its first check an else.
    probes: [
      { expr: `${R2_OFF} or ${LOOSE}(list(filter(${R2_MSG}, rerun({'score': '50'})[0])))[:1] == ['tryagain']`, hint: "Use an if/else that checks score, instead of typing the answers." },
      // Not in round 1: the check above reads only the first message, and when a first check with no else prints
      // nothing, that is the second check's Try again!, so it passed. With both scores at 50, both must print.
      { expr: `${R2_OFF} or ${LOOSE}(list(filter(${R2_MSG}, rerun({'score': '50'})[0]))) == ['tryagain', 'tryagain']`, hint: "Give your first check an else too, so it prints Try again! when the score is under 70." },
      { expr: `${R2_OFF} or ${LOOSE}(list(filter(${R2_MSG}, rerun({'score#2': '90'})[0])))[1:2] == ['youpassed']`, hint: "Do the same if/else check again after score = 50, instead of typing the answer." },
      { expr: `${R2_OFF} or list(filter(${R2_MSG}, rerun({'score': '50'})[0]))[:1] == ['Try again!'] and list(filter(${R2_MSG}, rerun({'score#2': '90'})[0]))[1:2] == ['You passed!']`, hint: "Check the spelling, capitals and punctuation of every message in your if/else checks, even the ones that didn't print this time." },
      // rules_a.py only tried 70 here, so `score > 50` or `score >= 60` passed; 69 must not pass. Both lines are
      // compared, so a first check that prints nothing for 69 fails too. Not in round 2: loosely, since every message
      // these two probes show was checked exactly above, so a "You Passed!" isn't also told to check its comparison.
      { expr: `${R2_OFF} or ${LOOSE}(list(filter(${R2_MSG}, rerun({'score': '70'})[0]))) == ['youpassed', 'tryagain'] and ${LOOSE}(list(filter(${R2_MSG}, rerun({'score': '69'})[0]))) == ['tryagain', 'tryagain']`, hint: "Check your comparison: a score of 70 or more should pass, and anything under 70 should not." },
      // Not in rules_a.py: the second score was only tried at 50 and 90, so a second check of
      // `score <= 50` or `score == 50` passed.
      { expr: `${R2_OFF} or ${LOOSE}(list(filter(${R2_MSG}, rerun({'score#2': '70'})[0]))) == ['youpassed', 'youpassed'] and ${LOOSE}(list(filter(${R2_MSG}, rerun({'score#2': '69'})[0]))) == ['youpassed', 'tryagain']`, hint: "Make your second check the same as your first one, so it also passes 70 or more and says Try again! for anything less." },
    ],
  },
  ch3_r3: {
    output: [{ expr: "lines(['Warm'])" }],
    // rules_a.py never tried a temp in 80-89, 60-69 or 40-49, so thresholds like >= 80, >= 60 or >= 40 passed;
    // 89, 69 and 49 (just under each edge) catch them. The first run only shows Warm, so the groups are checked
    // loosely first (see LOOSE above), then the other three words exactly, with a hint about spelling. Not in round 1:
    // 105, since ch3_boss's 90-100 invites `temp >= 90 and temp <= 100`, which says Warm for anything hotter. Not in
    // round 2: only once the first run shows Warm, with capitals and punctuation ignored, since otherwise the output check
    // has already named the wrong line, and a "Worm" isn't also told to fix its numbers.
    probes: [
      { expr: `${LOOSE}(L) != ['warm'] or all(${LOOSE}(rerun({'temp': t})[0]) == ${LOOSE}([w]) for t, w in [('105','Hot'), ('95','Hot'), ('90','Hot'), ('89','Warm'), ('70','Warm'), ('69','Cool'), ('55','Cool'), ('50','Cool'), ('49','Cold'), ('30','Cold')])`, hint: "Use if/elif/else on temp, with the same numbers and >= signs as the task, so every temperature lands in the right group." },
      { expr: `${LOOSE}(L) != ['warm'] or all(rerun({'temp': t})[0] == [w] for t, w in [('95','Hot'), ('69','Cool'), ('49','Cold')])`, hint: "Write each group's word just like the task, starting with a capital letter: Hot, Warm, Cool and Cold." },
    ],
  },
  ch3_r4: {
    output: [{ expr: "lines(['Access granted'])" }],
    concepts: [{ expr: "boolop('or')", hint: "Join your two checks with or, so either one can open the gate." }],
    // rules_a.py's one check here told `age >= 12 or has_permission` and `or "has_permission"` (always true)
    // to use if/else, which they did. Split so a wrong test and a missing else get their own hints.
    probes: [
      // Not in round 2: has_permission = "True" (in quotes) is text, which counts as true too, so every run passed, and
      // the reruns below replace it with a real True or False. The task sets it to True.
      { expr: "ns.get('has_permission') is True", hint: "Set has_permission to True with no quotes around it, so it holds True itself and not the text \"True\"." },
      // Not in round 1: Access denied printed after the if, not in an else, shows up with Access granted in the first
      // run, and was only told to check the age test.
      { expr: `not {'accessgranted', 'accessdenied'} <= set(${LOOSE}(L))`, hint: "Put Access denied in an else, so it only prints when the gate stays shut." },
      { expr: `'accessgranted' not in ${LOOSE}(rerun({'has_permission': 'False'})[0])`, hint: "With has_permission set to False, a 12-year-old shouldn't get in. Check your age test, and use has_permission itself, with no quotes around it." },
      // Split in two in round 3, so an else that prints "Access Denied!" is told about its spelling, not to add an else.
      { expr: `any('accessdenied' in r for r in ${LOOSE}(rerun({'has_permission': 'False'})[0]))`, hint: "Add an else that prints Access denied, for when neither check is true." },
      { expr: "rerun({'has_permission': 'False'})[0] == ['Access denied']", hint: "Write Access denied in your else just like the task, with the same capital letters and punctuation." },
      // rules_a.py only tried 15, so `age > 13` or `age >= 14` passed; 13 itself must get in.
      { expr: `all(${LOOSE}(rerun({'has_permission': 'False', 'age': a})[0]) == ['accessgranted'] for a in ('13', '15'))`, hint: "Anyone 13 or older should get in even without permission, so check your age test: 13 itself counts." },
    ],
  },
  ch3_r5: {
    output: [{ expr: "lines(['Easy win!'])" }],
    // nested_if() alone missed `if not has_sword: ... else:` with the if/else inside the else, because in the
    // ast that looks just like an elif. Only the column tells them apart: an elif starts where its if does. Not in
    // round 2: the inner if/else may be the inline form ch3_s2 teaches, print("Tough fight!" if ... else "Easy win!"),
    // inside an if or inside another inline if/else.
    concepts: [{ expr: "nested_if() or any(isinstance(n, ast.If) and len(n.orelse) == 1 and isinstance(n.orelse[0], ast.If) and n.orelse[0].col_offset > n.col_offset for n in ast.walk(TREE)) or any(isinstance(n, (ast.If, ast.IfExp)) and any(isinstance(m, ast.IfExp) for part in ((n.body + n.orelse) if isinstance(n, ast.If) else [n.body, n.orelse]) for m in ast.walk(part)) for n in ast.walk(TREE))", hint: "Put an if/else inside another if, so the monster check only happens when you have a sword." }],
    probes: [
      // Not in round 2: has_sword = "True" (in quotes) is text, which counts as true too, and every rerun replaced it.
      { expr: "ns.get('has_sword') is True", hint: "Set has_sword to True with no quotes around it, so it holds True itself and not the text \"True\"." },
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
      // Not in round 1: a loop of `if v: pass`, then the five answers typed into five print()s, passed. A print() that
      // names truthy or falsy (just one of them, so a "truthy or falsy?" header is fine) sits in an if or an inline
      // if, or in a loop or a function, where an early continue or return can pick it (if v: print("truthy");
      // continue, then print("falsy")). Not in round 2: a header (see HEADERISH above), like print("Which values are
      // truthy?"), may sit anywhere.
      { expr: String.raw`(lambda inside: not any(isinstance(p, ast.Call) and isinstance(p.func, ast.Name) and p.func.id == 'print' and any(isinstance(c, ast.Constant) and isinstance(c.value, str) and len({w.lower().replace('falsey', 'falsy') for w in re.findall(r'(?i)\b(?:truthy|falsy|falsey)\b', c.value)}) == 1 and not ${HEADERISH}(c.value) and id(c) not in inside for c in ast.walk(p)) for p in ast.walk(TREE)))({id(m) for n in ast.walk(TREE) if isinstance(n, (ast.If, ast.IfExp, ast.For, ast.While, ast.FunctionDef, ast.Lambda, ast.ListComp, ast.GeneratorExp, ast.Match)) for m in ast.walk(n)})`, hint: "Print truthy or falsy from inside your if/else, so Python's test picks the word for each value." },
    ],
  },
  ch3_s2: {
    output: [{ expr: "lines(['minor', 'boiling', 'game over'])" }],
    concepts: [{ expr: "count(ast.IfExp) >= 3", hint: "Use the inline form for all three, like print(\"yes\" if test else \"no\")." }],
    // The first run only shows minor, boiling and game over, so the other three words are first checked loosely
    // (see LOOSE above), then exactly, with a hint about spelling. Then one edge per test, each with its own hint.
    // Not in round 2: the first rerun used age 20, so an age test like age >= 21 was told it typed the words; 99, 0 and
    // 99 are far from every edge. And the probes only count once the first run's lines are right, with capitals, spaces
    // and punctuation ignored, since otherwise the output check has already named the problem.
    probes: [
      { expr: `${S2_OFF} or ${LOOSE}(rerun({'age': '99', 'temp': '0', 'lives': '99'})[0]) == ${LOOSE}(['adult', 'not yet', 'keep going'])`, hint: "Base each answer on age, temp and lives, instead of typing the words." },
      { expr: `${S2_OFF} or rerun({'age': '99', 'temp': '0', 'lives': '99'})[0] == ['adult', 'not yet', 'keep going']`, hint: "Write every answer just like the task, in small letters: adult, not yet and keep going too, not just the ones printed now." },
      // Not in rules_a.py: no test sat on an edge, so `age > 18` (or temp == 100, or lives != 3) passed. One probe
      // for each test, so a wrong lives test (lives > 1) isn't told about age and temp.
      { expr: `${S2_OFF} or rerun({'age': '18'})[0][:1] == ['adult'] and rerun({'age': '17'})[0][:1] == ['minor']`, hint: "Check your age test: 18 or older is an adult, so 18 itself counts." },
      { expr: `${S2_OFF} or rerun({'temp': '150'})[0][1:2] == ['boiling'] and rerun({'temp': '99'})[0][1:2] == ['not yet']`, hint: "Check your temp test: 100 or more is boiling, so 150 is boiling too, and 99 is not yet." },
      { expr: `${S2_OFF} or rerun({'lives': '1'})[0][2:3] == ['keep going']`, hint: "Check your lives test: it's only game over when lives is exactly 0, so 1 life means keep going." },
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
      { expr: `${BOOLS}(L) != ['True', 'False', 'True'] or ${BOOLS}(rerun({'x': '40'})[0]) == ['True', 'True', 'True']`, hint: "Compare x itself in each line, with the same numbers as the task, instead of typing True or False." },
      // rules_a.py only tried x = 5 here, so no upper end was ever tested: 30 <= x <= 50 on line 2, or
      // 10 < x < 100 on line 3, passed. 75, 150 and 0 test the other ends; the edges themselves aren't
      // tried here, since "between 1 and 50" can mean < or <=. Not in round 1: 49, just inside every range's top,
      // so a typo like 10 < x < 49 fails.
      { expr: `all(${BOOLS}(rerun({'x': v})[0]) == w for v, w in [('5', ['True', 'False', 'False']), ('49', ['True', 'True', 'True']), ('75', ['False', 'True', 'False']), ('150', ['False', 'False', 'False']), ('0', ['False', 'False', 'False'])])`, hint: "Check the numbers in each chained comparison, the low end and the high end, against the range from the task." },
      // Not in rules_a.py: the third check is spelled out as 10 < x < 50, so 10 and 50 are outside it, and 10 <= x
      // or x <= 50 passed. x = 10 gives True, False, False on any reading of the first two; x = 50 is on the first
      // one's edge, so there only the last two answers count.
      { expr: `${BOOLS}(rerun({'x': '10'})[0]) == ['True', 'False', 'False'] and ${BOOLS}(rerun({'x': '50'})[0])[1:] == ['True', 'False']`, hint: "Check the signs in your third comparison: the task says 10 < x < 50, so neither 10 nor 50 counts." },
    ],
  },
  ch3_boss: {
    // Split from rules_a.py's one check, so "Great Job!" is told about the message's spelling, not to print it. Each
    // message is found with no letter or extra ! . ? touching it (see MSG_IN above), so "Great job!!" and
    // "Needs work!" don't pass as Great job! and Needs work.
    output: [
      // Not in round 2: a small b is told about its capital, not about its if tests (see LOWER_GRADE above).
      { expr: `not ${LOWER_GRADE}(L, 'B')`, hint: "So close! Write the letter grade as a capital letter, just like the task." },
      { expr: String.raw`re.search(r'\bB\b', out) is not None`, hint: "A score of 87 is a B. Print the letter grade, and check the numbers in your if and elif tests." },
      { expr: `${MSG_IN}('Great job!', out)`, hint: "Print B's message too, written exactly as the task shows it, with the same capital letters and punctuation." },
      { expr: "not any(m in out for m in ['Excellent!', 'Not bad!', 'Needs work', 'Try harder!'])", hint: "Print only B's message: use elif and else, so only the first test that matches prints." },
    ],
    // rules_a.py tried 95/90/75/65/40, so > 80, > 70, > 60 or >= 50 passed. Now every edge (90, 80, 70, 60)
    // and the score just under it is tried, each run once, and only the right band's message may show.
    // The first run only shows Great job!, so the other messages are checked first, exactly, in one run inside each
    // band, but only where that run's letter is right: a wrong letter is the next check's to name. The edges are
    // then checked with the messages compared loosely (see LOOSE above), so a slip in Great job!'s capitals, which
    // the output check names, isn't also blamed on the edges.
    probes: [
      { expr: String.raw`all((lambda t: not re.search(r'\b%s\b' % g, t) or ${MSG_IN}(m, t))('\n'.join(rerun({'score': s})[0])) for s, g, m in [('99', 'A', 'Excellent!'), ('75', 'C', 'Not bad!'), ('65', 'D', 'Needs work'), ('30', 'F', 'Try harder!')])`, hint: "Write every grade's message just like the task, with the same spelling, capital letters and punctuation, even the ones a score of 87 doesn't print." },
      // Not in round 2: a letter printed small, like print("d"), is told that, not to check the edges.
      { expr: `not any(${LOWER_GRADE}(rerun({'score': s})[0], g) for s, g in [('99', 'A'), ('75', 'C'), ('65', 'D'), ('30', 'F')])`, hint: "Write every letter grade as a capital letter, just like the task: A, B, C, D and F." },
      { expr: String.raw`all((lambda R: re.search(r'\b%s\b' % g, '\n'.join(R)) and (lambda z: re.sub(r'[\W_]+', '', m.lower()) in z and sum(x in z for x in ('excellent', 'greatjob', 'notbad', 'needswork', 'tryharder')) == 1)('\n'.join(${LOOSE}(R))))(rerun({'score': s})[0]) for s, g, m in [('95','A','Excellent!'), ('90','A','Excellent!'), ('89','B','Great job!'), ('80','B','Great job!'), ('79','C','Not bad!'), ('75','C','Not bad!'), ('70','C','Not bad!'), ('69','D','Needs work'), ('65','D','Needs work'), ('60','D','Needs work'), ('59','F','Try harder!'), ('40','F','Try harder!')])`, hint: "Pick the grade with if/elif/else on score, and check each edge: exactly 90 is an A, 80 a B, 70 a C and 60 a D." },
    ],
  },
  grind_4: {
    // rules_a.py's \b[A-F]\b also counted the word "A" in "A score of 73 gets a C" (see GRADES above). Split in
    // two, so a wrong letter and a second letter (separate ifs, not elif) each get their own hint.
    output: [
      // Not in round 2: a small c is told about its capital, not about its if tests (see LOWER_GRADE above).
      { expr: `not ${LOWER_GRADE}(L, 'C')`, hint: "So close! Write the letter grade as a capital letter, just like the task." },
      { expr: `'C' in ${GRADES}(out)`, hint: "A score of 73 should get a C. Check the numbers and signs in your if and elif tests." },
      { expr: `${GRADES}(out) == ['C']`, hint: "Print just one letter grade: use elif and else, so only the first test that matches prints." },
    ],
    // rules_a.py never tried 70 or 60 (and the hint named only 90 and 80), so > 70 or > 60 passed. Not in round 1: the
    // first probe catches a typed letter (still C for 95 and for 10), so it isn't told about the edges; a wrong order of
    // tests, like >= 70 first, still changes the letter for 10.
    probes: [
      { expr: `not all('C' in ${GRADES}('\\n'.join(rerun({'score': s})[0])) for s in ('95', '10'))`, hint: "Print the letter your if/elif/else picks, instead of typing it, so it changes when score does." },
      // Not in round 2: a letter printed small, like print("f"), is told that, not to check the edges.
      { expr: `not any(${LOWER_GRADE}(rerun({'score': s})[0], g) for s, g in [('95', 'A'), ('85', 'B'), ('65', 'D'), ('10', 'F')])`, hint: "Write every letter grade as a capital letter, just like the task: A, B, C, D and F." },
      { expr: `all(${GRADES}('\\n'.join(rerun({'score': s})[0])) == [g] for s, g in [('95','A'), ('90','A'), ('89','B'), ('85','B'), ('80','B'), ('79','C'), ('70','C'), ('69','D'), ('65','D'), ('60','D'), ('59','F'), ('10','F')])`, hint: "Pick the letter with if/elif/else on score, and check each edge: exactly 90 is an A, 80 a B, 70 a C and 60 a D." },
    ],
  },
  grind_5: {
    // rules_a.py wanted exactly one line with a yes/no meaning, which failed a title like "Leap Year Checker"
    // (polarity reads "leap year" as yes). The last such line is the answer.
    // LEAP (above) reads each line, not grading.py's polarity(), so "2023 is a regular year" or "Common year" is a no.
    output: [{ expr: `[p for p in map(${LEAP}, L) if p][-1:] == [1]`, hint: "2024 is a leap year, so your program should print a line that says it is one. If yours says it isn't, check your rule." }],
    // rules_a.py tried only 1900, 2000 and 2023, and its hint named 1900 and 2000, so special-casing
    // `year == 1900` passed. 2100 and 2400 aren't named anywhere. Not in rules_a.py: 2020 (a leap year) and 2022
    // (even, but not divisible by 4) catch a wrong number in the first part, like year % 2 or year % 8. Not in round 1:
    // 1800, a multiple of 200 and 40 that isn't a leap year, so year % 40 or % 200 typed for % 400 fails. % 80 or % 16
    // can't be caught: with the % 100 part they give the same answer as % 400 for every year.
    // Not in round 2: a line that every run prints the same, like a closing "Thanks for using the leap year checker!"
    // (which reads as a yes), isn't the answer, since the answer changes with the year. The first run counts as one of
    // the runs, so a typed "2024 is a leap year" is still no answer for 2023.
    probes: [{ expr: `(lambda runs: (lambda same: all([p for p in map(${LEAP}, [l for l in R if l not in same]) if p][-1:] == [want] for R, want in runs))(set.intersection(*[set(R) for R, _ in runs])))([(L, 1)] + [(rerun({'year': y})[0], want) for y, want in [('1800', -1), ('1900', -1), ('2000', 1), ('2020', 1), ('2022', -1), ('2023', -1), ('2100', -1), ('2400', 1)]])`, hint: "Use every part of the rule from the task, with the same numbers, % and the words and/or, so your program is right for any year, not just 2024." }],
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
    // NUM_LINE above). The task gives no layout, so labels ("Even: 2") and a row per count (2 4 6 8 10, from
    // print(i, end=" ")) are fine too (see NUM_READS above). Not in round 2: so are the starter's own comments printed as
    // headers, "Even numbers 2-10" and "Countdown 5 to 1", whose numbers aren't results (see ALL_READS above).
    output: [
      { expr: `any(len(r) == 10 for r in ${ALL_READS}([l for l in L if ${NUM_LINE}(l)]))`, hint: "Print ten numbers in all: 2 through 10 counting by 2, then 5 down to 1." },
      { expr: `['2', '4', '6', '8', '10', '5', '4', '3', '2', '1'] in ${ALL_READS}([l for l in L if ${NUM_LINE}(l)])`, hint: "One of your numbers isn't right yet, so check the start, stop and step you give each range()." },
    ],
    concepts: [
      { expr: "count(ast.For) >= 2", hint: "Use two for loops: one for the even numbers and one for the countdown." },
      // rules_a.py counted any 3-argument range, so range(1, 6, 1) with print(i * 2) passed; a step of 1
      // isn't the counting the task asks range() to do.
      { expr: "sum(isinstance(n, ast.Call) and isinstance(n.func, ast.Name) and n.func.id == 'range' and len(n.args) == 3 and not (isinstance(n.args[2], ast.Constant) and n.args[2].value == 1) for n in ast.walk(TREE)) >= 2", hint: "Let range() do the counting both times: give it a start, a stop and a step, like the task shows." },
      // Not in round 1: a countdown loop that does nothing (pass), then print(5) ... print(1), passed.
      { expr: NO_TYPED_NUMBER, hint: "Print the loop's variable from inside each loop, instead of typing a number yourself." },
    ],
  },
  ch4_r3: {
    // The letter match is (?i) too, like the kind match (rules_a.py's wasn't), so char.upper() is fine. Split in
    // two, so six lines with a letter labeled wrong (char in "AEIOU") are told that, not how to lay the lines out.
    // KIND (above) reads "p is not a vowel" as a consonant.
    // Not in round 1: only the lines that say vowel or consonant count (see R3_LINES above), so a header like "Checking
    // the letters in python" is fine, as in grind_3, grind_6, ch3_s1 and ch4_r2.
    output: [
      { expr: `(lambda K: len(K) == 6 and all(re.search(r'(?i)\\b%s\\b' % ch, l) for l, ch in zip(K, 'python')))(${R3_LINES}(L, 6))`, hint: "Print one line for each letter, with the letter and the word vowel or consonant." },
      { expr: `[${KIND}(l) for l in ${R3_LINES}(L, 6)] == ['consonant', 'consonant', 'consonant', 'consonant', 'vowel', 'consonant']`, hint: "One of your letters has the wrong label. Only a, e, i, o and u are vowels, so check the test in your if." },
    ],
    // rules_a.py's word 'audio' has no e, so char in "aiou" passed; 'education' has all five vowels. Split so a loop
    // over a typed "python" instead of word is told that: its line count doesn't grow from 6 to 9 with the word (a
    // kid printing two lines a letter is already told about that). The labels are only read once the first run's
    // are right, since otherwise the output check has named the wrong one.
    probes: [
      // Not in round 2: only once the first run shows six letter lines, since otherwise the output check has already
      // named the problem, and an if placed after the loop isn't also told to loop through word.
      { expr: `len(${R3_LINES}(L, 6)) != 6 or len(${R3_LINES}(rerun({'word': "'education'"})[0], 9)) == 9`, hint: "Loop through the word variable, so your program works for any word, not just python." },
      { expr: `[${KIND}(l) for l in ${R3_LINES}(L, 6)] != ['consonant', 'consonant', 'consonant', 'consonant', 'vowel', 'consonant'] or [${KIND}(l) for l in ${R3_LINES}(rerun({'word': "'education'"})[0], 9)] == ['vowel', 'consonant', 'vowel', 'consonant', 'vowel', 'consonant', 'vowel', 'vowel', 'consonant']`, hint: "Check that your if counts all five vowels, a, e, i, o and u, so it works for other words too." },
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
    // Not in round 1: rules_a.py wanted the bare numbers, one per line. The task only says to print each odd number, so
    // a label ("Odd: 1") and all four on one line (print(i, end=" ")) are fine too (see R5_NUMS above). A label must
    // be the same on every line, so a loop that stops at 5 and then prints "Found one divisible by 7!" doesn't pass
    // as 1, 3, 5, 7. Split in three, so a missing continue, a missing break and a 7 left out each get their own hint.
    // Not in round 2: a header or a closing line, like "Odd numbers from 1 to 20, until one divides by 7" or "Found a
    // number divisible by 7!" after the 7, isn't one of the odd numbers (see R5_K above).
    output: [
      { expr: `not any(re.fullmatch(r'-?\\d+', x) and int(x) % 2 == 0 for x in ${R5_NUMS})`, hint: "Use continue to skip the even numbers, so only the odd ones get printed." },
      { expr: `(lambda N: len(N) <= 4 or N[:4] != ['1', '3', '5', '7'])(${R5_NUMS})`, hint: "Stop the loop with break right after it prints 7, the first odd number divisible by 7." },
      // Not in round 2: a loop that stops at 5 because its break tests for another number (i % 5 == 0) has no 7 in its
      // code, and is told to check that test, not where it prints.
      { expr: `${R5_NUMS} != ['1', '3', '5'] or any(isinstance(n, ast.Constant) and not isinstance(n.value, bool) and n.value == 7 for n in ast.walk(TREE))`, hint: "Check the test in the if that holds your break: it should stop the loop at the first odd number divisible by 7." },
      { expr: `${R5_NUMS} != ['1', '3', '5']`, hint: "Print each odd number before you check it for 7, so the 7 gets printed before break stops the loop." },
      { expr: String.raw`(lambda K: ${R5_NUMS} == ['1', '3', '5', '7'] and (len(K) == 1 or len({re.sub(r'\d+', '#', l) for l in K}) == 1))(${R5_K})`, hint: "Print the odd numbers 1, 3, 5 and 7, each one the same way, from inside your loop." },
    ],
    concepts: [
      { expr: "count(ast.Continue) >= 1", hint: "Use continue to skip the even numbers." },
      { expr: "count(ast.Break) >= 1", hint: "Use break to stop the loop at the number divisible by 7." },
      // Not in rules_a.py: a loop that breaks before printing 7 (1, 3, 5), patched with a print(7) after it,
      // passed, and so did the four numbers typed into one print(). No print() needs a number typed into it (text
      // with a number in it, like "Found one divisible by 7!", is fine), while print(i) after the loop is fine.
      { expr: NO_TYPED_NUMBER, hint: "Print each odd number from inside the loop with the loop's variable, instead of typing a number yourself." },
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
    // Not in round 1: an Access granted! printed after every guess (more than once), or a break outside the if (only
    // java is tried), was told to print Trying: lines it already printed, so each of those gets its own hint first.
    output: keptLines(S3_KEEP, ['Trying: java', 'Trying: ruby', 'Trying: python', 'Access granted!'], [
      [`${LOOSE}(K[:1]) == ['tryingjava']`, "For each guess, print Trying: and then the guess itself, before you check it against the password."],
      [`${LOOSE}(K).count('accessgranted') <= 1`, "Print Access granted! only when a guess matches the password: put it inside an if that compares the guess with password."],
      // An Access granted! before Trying: python is a check made before its Trying: line, which the next check names.
      [`len([k for k in ${LOOSE}(K) if k.startswith('trying')]) >= 3 or 'accessgranted' in ${LOOSE}(K[:3])`, "Your loop stops too soon: put break inside your if, so it only stops once a guess matches the password."],
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
    // Not in round 1: rules_a.py wanted the bare countdown numbers, one per line. The task gives LIFTOFF! and the
    // Altitude lines exactly, but no format for the countdown, so "10...", "T-minus 10" and a row like 10 9 8 6 ... are
    // fine: the countdown is the numbers before LIFTOFF! (see NUM_READS above). Blank lines don't count. The LIFTOFF!
    // line is found with capitals, spaces and punctuation ignored, so the checks after it can name a slip in it.
    // Not in round 2: a header with a number in it, like the starter's own "Countdown (skip 7)", isn't part of the
    // countdown (see ALL_READS above), and a closing line after the altitudes is fine (see BOSS4 above).
    output: [
      { expr: `any(${LOOSE}([l]) == ['liftoff'] for l in L)`, hint: "Print LIFTOFF! on a line of its own, after the countdown and before the altitudes." },
      { expr: `['10', '9', '8', '6', '5', '4', '3', '2', '1'] in ${ALL_READS}([l for l in ${BOSS4}[0] if ${NUM_LINE}(l)])`, hint: "Check your countdown before LIFTOFF!: it goes from 10 down to 1 and skips only the 7." },
      { expr: `${LOOSE}(${BOSS4}[1]) == ${LOOSE}(${ALTITUDES})`, hint: "After LIFTOFF!, print the five altitudes, from Altitude: 100 up to Altitude: 500, counting by 100s." },
      { expr: "'LIFTOFF!' in L", hint: "So close! Write LIFTOFF! just like the task: all capital letters, no space, and an ! at the end." },
      { expr: `(lambda A, W: A == W or [''.join(a.split()) for a in A] != [''.join(w.split()) for w in W])(${BOSS4}[1], ${ALTITUDES})`, hint: "So close! Check the spaces: the task shows Altitude: 100, with one space after the colon." },
      { expr: `${BOSS4}[1] == ${ALTITUDES}`, hint: "So close! Check your capital letters and punctuation: each line looks like Altitude: 100, with a capital A and a colon." },
    ],
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
    // A header like "Multiplication table for 7:" is fine: only lines with an = count (see keptLines above). Not in
    // round 1: rows like "7 x 1: 7" or "7 x 1 is 7" have no =, so none of them counted and the kid was told to print
    // ten lines, which they had. Rows that start with 7 and have another number, but no =, are named first.
    output: keptLines(String.raw`(lambda l: '=' in l)`, ['7 x 1 = 7', '7 x 2 = 14', '7 x 3 = 21', '7 x 4 = 28', '7 x 5 = 35', '7 x 6 = 42', '7 x 7 = 49', '7 x 8 = 56', '7 x 9 = 63', '7 x 10 = 70'], [
      [String.raw`len(K) == 10 or all('=' in l for l in L if re.match(r'\s*7\b\D+\d', l))`, "Put an = sign in every line of your table, just like 7 x 1 = 7 in the task."],
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
    // Not in round 2, which wanted one answer per line (a lines([...]) check): the task gives no layout, so all 20 on one
    // row, from print(..., end=" "), is fine too, as ch4_r2 allows (see FIZZ_ROWS above). grading.py only names the
    // wrong line of a lines([...]) check, so each kind of answer gets its own hint instead.
    output: [
      { expr: `(lambda R: len(R) == 20 and ${LOOSE}(R[:1]) == ['1'])(${FIZZ_ROWS})`, hint: "Print one answer for each number from 1 to 20, 20 in all, so check where your loop starts and stops." },
      { expr: `${LOOSE}(${FIZZ_ROWS})[14] == 'fizzbuzz'`, hint: "Check 15: it's a multiple of both 3 and 5, so test for both before you test for 3 or 5 on its own." },
      { expr: `all(${LOOSE}(${FIZZ_ROWS})[k - 1] == 'fizz' for k in (3, 6, 9, 12, 18))`, hint: "Check the multiples of 3, like 3, 6 and 9: each one should print Fizz." },
      { expr: `all(${LOOSE}(${FIZZ_ROWS})[k - 1] == 'buzz' for k in (5, 10, 20))`, hint: "Check the multiples of 5, like 5 and 10: each one should print Buzz." },
      { expr: `all(${LOOSE}(${FIZZ_ROWS})[k - 1] == str(k) for k in (1, 2, 4, 7, 8, 11, 13, 14, 16, 17, 19))`, hint: "Check the numbers that aren't multiples of 3 or 5, like 1, 2 and 4: each one should print just the number." },
      { expr: `(lambda R, W: R == W or [''.join(r.split()) for r in R] != W)(${FIZZ_ROWS}, ${FIZZ_W})`, hint: "So close! Check the spaces: each answer is one word or number, with no spaces in it, like FizzBuzz." },
      { expr: `${FIZZ_ROWS} == ${FIZZ_W}`, hint: "So close! Check your capital letters and punctuation: write Fizz, Buzz and FizzBuzz just like the task." },
    ],
    // As for grind_6: typed answers (in prints, or in a list a loop prints) have Fizz six times and Buzz four.
    // A program that works them out types each word once, or twice with "Fizz" + "Buzz".
    concepts: [{ expr: "sum(s.lower().count('fizz') for s in str_consts()) <= 3 and sum(s.lower().count('buzz') for s in str_consts()) <= 3", hint: "Let your program decide for each number whether to print Fizz, Buzz or FizzBuzz, instead of typing the answers in." }],
  },
};
