// Grading rules for chapters 1-4 and practice grind_0-7 (ported from rules_a.py). Format: see src/checks.js.
// Hints are read by 9-12 year olds: one step to take, never the whole answer.
// Where rules_a.py built an expected-lines list with code (a comprehension or '-' * 20), the list is
// written out here. It passes the same programs, and grading.py only names the first wrong line
// ("so close!") for a literal lines([...]) check.
export const BATCH_A = {
  // ── Chapter 1: The Terminal ──
  ch1_r1: { output: [{ expr: "lines(['Hello, World!'])" }] },
  ch1_r2: { output: [{ expr: "lines(['I am a coder','I am brave','I am ready'])" }] },
  ch1_r3: {
    output: [{ expr: "lines(['Comments help me remember'])" }],
    concepts: [{ expr: "len(new_comments()) >= 1", hint: "Add a comment of your own that starts with # and says what your program does (the one that was already there doesn't count)." }],
  },
  ch1_r4: {
    output: [{ expr: "L == [str(ns.get('hero_name'))]", hint: "Print the name that's stored in hero_name, with nothing else on the line." }],
    probes: [
      { expr: "isinstance(ns.get('hero_name'), str) and ns['hero_name'].strip() != ''", hint: "Make a variable called hero_name and put a name inside it, in quotes." },
      { expr: "rerun({'hero_name': \"'Zed'\"})[0] == ['Zed']", hint: "Print the hero_name variable, with no quotes around it, instead of typing the name." },
    ],
  },
  ch1_r5: {
    output: [{ expr: "lines(['42'])" }],
    probes: [
      { expr: "ns.get('a') == 15 and ns.get('b') == 27", hint: "Make two number variables: a should be 15 and b should be 27." },
      { expr: "rerun({'a': '1', 'b': '2'})[0] == ['3']", hint: "Let Python do the adding: print a + b instead of typing the answer." },
    ],
  },
  ch1_r6: {
    output: [{ expr: "L == [f\"I love {ns.get('food')} so much!\"]", hint: "Print I love, then your food, then so much! on one line." }],
    concepts: [{ expr: "fstrings() >= 1", hint: "This room is about f-strings. Put an f before the quotes and your variable in {curly braces}." }],
    probes: [
      { expr: "isinstance(ns.get('food'), str) and ns['food'].strip() != ''", hint: "Make a variable called food and put your favorite food inside it, in quotes." },
      { expr: "rerun({'food': \"'tacos'\"})[0] == ['I love tacos so much!']", hint: "Put {food} in your f-string instead of typing the food, so the sentence changes when food does." },
    ],
  },
  ch1_s1: {
    output: [{ expr: "lines(['Roses are red','Violets are blue','Python is fun'])" }],
    concepts: [
      { expr: "calls('print') == 1", hint: "Use just one print() this time, with \\n inside the text wherever a new line should start." },
      { expr: "not loop_calls('print')", hint: "Don't use a loop here: one print() with \\n inside the text can show all three lines." },
    ],
  },
  ch1_s2: {
    output: [{ expr: "L == [f\"{ns.get('greeting')}, {ns.get('name')}! Welcome to CodeQuest.\"]", hint: "Check the pieces you glue together: the comma, the spaces and the ! all have to be there." }],
    concepts: [
      { expr: "fstrings() == 0", hint: "No f-strings in this room: join the pieces with + instead." },
      { expr: "binop('Add') >= 1", hint: "Use the + sign to glue your strings together." },
    ],
    probes: [
      { expr: "ns.get('greeting') == 'Hello' and isinstance(ns.get('name'), str) and ns['name'].strip() != ''", hint: "Make greeting hold \"Hello\" and name hold any name you like." },
      { expr: "rerun({'name': \"'Zed'\"})[0] == ['Hello, Zed! Welcome to CodeQuest.']", hint: "Join your greeting and name variables with +, instead of typing the name into the text." },
    ],
  },
  ch1_s3: {
    output: [
      { expr: "nums([3, 72, 4320, 259200])", hint: "Print all four numbers in order: days, then hours, then minutes, then seconds." },
      { expr: "bool(re.search(r'(?i)h(ou)?r', out) and re.search(r'(?i)min', out) and re.search(r'(?i)sec', out))", hint: "Put a label next to each number, like hours, minutes or seconds, so we know what it means." },
    ],
    concepts: [{ expr: "fstrings() >= 1", hint: "Print your results with an f-string: an f before the quotes and each variable in {curly braces}." }],
    probes: [{ expr: "nums([1, 24, 1440, 86400], L=rerun({'days': '1'})[0])", hint: "Work out hours from days, minutes from hours and seconds from minutes, so the whole chain changes when days does." }],
  },
  ch1_boss: {
    output: [{ expr: "len(L) == 1 and re.fullmatch(r'My name is (.+), I am (.+), and I love (.+)', L[0]) is not None", hint: "Print one sentence that follows the pattern exactly: My name is ___, I am ___, and I love ___" }],
    concepts: [
      { expr: "fstrings() >= 1", hint: "Use an f-string: an f before the quotes and your variables in {curly braces}." },
      // Not in rules_a.py: f"My name is Alex, ..." with the values typed in passed every other check,
      // because the probe only asks that each value is also stored in some variable.
      { expr: "count(ast.FormattedValue) >= 3", hint: "Put all three of your variables inside {curly braces} in the f-string, instead of typing their values." },
    ],
    // With three {variables} already required, this mostly fails on extra text in a blank that the
    // output regex's (.+) let through, like "{age} years old" or "{game}!", so the hint names that.
    probes: [{ expr: "all(any(str(v) == cap for k, v in ns.items() if not k.startswith('__')) for cap in re.fullmatch(r'My name is (.+), I am (.+), and I love (.+)', L[0]).groups())", hint: "Fill each ___ blank with just one variable in {curly braces}, and add no extra words or punctuation, not even at the end." }],
  },
  grind_0: { output: [{ expr: "lines(['####','#  #','#  #','####'])" }] },
  grind_1: {
    output: [{ expr: "L == [f\"The {ns.get('animal')} ate {ns.get('number')} {ns.get('food')}s\"]", hint: "Print one line: The, your animal, ate, your number, then your food with an s on the end." }],
    probes: [
      { expr: "all(k in ns for k in ('animal', 'food', 'number'))", hint: "Make three variables called animal, food and number." },
      { expr: "rerun({'animal': \"'dog'\"})[0][:1] and rerun({'animal': \"'dog'\"})[0][0].startswith('The dog ate')", hint: "Use your variables in the sentence instead of typing the words, so it changes when they do." },
      // Not in rules_a.py: the rerun above only changes animal, so typing the food and number passed.
      // number goes in as text, so a program that joins it with + still works.
      { expr: "rerun({'animal': \"'dog'\", 'food': \"'bone'\", 'number': \"'2'\"})[0] == ['The dog ate 2 bones']", hint: "Use all three variables in the sentence, food and number too, instead of typing them." },
    ],
  },

  // ── Chapter 2: The Vault ──
  ch2_r1: {
    output: [{ expr: "lines([\"<class 'str'>\", \"<class 'int'>\", \"<class 'float'>\"])" }],
    probes: [
      { expr: "type(ns.get('word')) is str and type(ns.get('whole')) is int and type(ns.get('decimal')) is float", hint: "word should hold text in quotes, whole a whole number like 7, and decimal a number with a dot like 2.5." },
      // Not in rules_a.py: typing the three <class ...> lines by hand passed, since the values are free.
      { expr: "rerun({'word': '7', 'whole': '2.5', 'decimal': \"'x'\"})[0] == [\"<class 'int'>\", \"<class 'float'>\", \"<class 'str'>\"]", hint: "Print type() of each of your variables, instead of typing what it says." },
    ],
  },
  ch2_r2: {
    output: [{ expr: "nums_per_line([15, 5, 50, 10/3, 3, 16])", hint: "Print six lines, one answer on each, in the same order as the task." }],
    concepts: [{ expr: "all(binop(op) >= 1 for op in ('Add','Sub','Mult','Div','FloorDiv','Pow'))", hint: "Let Python do the math: write each calculation with + - * / // or ** instead of typing the answer." }],
  },
  ch2_r3: {
    output: [{ expr: "lines(['THE VAULT AWAITS', 'the quest awaits', '16'])" }],
    probes: [{ expr: "rerun({'message': \"'a vault b'\"})[0] == ['A VAULT B', 'a quest b', '9']", hint: "Use .upper(), .replace() and len() on the message variable instead of typing the results." }],
  },
  ch2_r4: {
    output: [{ expr: "lines(['The code is 57'])" }],
    concepts: [
      { expr: "fstrings() >= 1", hint: "Print the answer with an f-string: an f before the quotes and the variable in {curly braces}." },
      { expr: "binop('FloorDiv') >= 1 and binop('Mult') >= 1", hint: "Type the whole calculation into your code, with * and //, and let Python work out the answer." },
      // Not in rules_a.py: f"The code is 57" (an f-string with the answer typed in) passed every check.
      { expr: "count(ast.FormattedValue) >= 1", hint: "Put code inside {curly braces} in your f-string, so Python fills in the number for you." },
    ],
    probes: [{ expr: "ns.get('code') == 57", hint: "Store the answer in a variable called code, then print it." }],
  },
  ch2_r5: {
    output: [
      { expr: "nums([100, 10.0, 110.0])", hint: "Print subtotal, tax and total, in that order." },
      // rules_a.py wanted a letter on every line, which failed a receipt with a ---- divider or a blank
      // line; only lines with a number need a label.
      { expr: "len(L) >= 3 and all(re.search('[A-Za-z]', l) for l in L if re.search(r'\\d', l))", hint: "Put a label in front of each number, like Subtotal:, so the shopper knows what it is." },
    ],
    probes: [
      { expr: "ns.get('subtotal') == 100 and ns.get('tax') == 10.0 and ns.get('total') == 110.0", hint: "Make the variables subtotal, tax and total, using the formulas from the task." },
      { expr: "nums([40, 4.0, 44.0], L=rerun({'price': '10'})[0])", hint: "Work out each value from price and quantity instead of typing the numbers, so the calculator works for any price." },
    ],
  },
  ch2_s1: {
    output: [
      // Swapped from rules_a.py so an even/odd mix-up gets this hint, not the generic one below.
      // \D* (rules_a.py had .*) stops at the next number, so "15 is odd, 42 is even" on one line
      // isn't read as 15 ... even.
      { expr: "not re.search(r'(?i)\\b15\\b\\D*\\beven|\\b42\\b\\D*\\bodd|\\b7\\b\\D*\\beven', out)", hint: "One of your numbers says the wrong thing: a number is even when number % 2 is 0." },
      { expr: "subseq([r're:(?i).*\\b15\\b.*\\bodd\\b.*', r're:(?i).*\\b42\\b.*\\beven\\b.*', r're:(?i).*\\b7\\b.*\\bodd\\b.*'])", hint: "For each number, print the number and the word even or odd." },
    ],
    concepts: [{ expr: "binop('Mod') >= 1", hint: "Use % 2 to let Python work out whether each number is even or odd." }],
  },
  ch2_s2: {
    output: [{ expr: "lines(['CodeCodeCode', 'C', 'e', '--------------------'])" }],
    probes: [{ expr: "rerun({'word': \"'Robot'\"})[0] == ['RobotRobotRobot', 'R', 't', '-' * 20]", hint: "Use word with *, [0] and [-1] instead of typing the letters, so it works for any word." }],
  },
  ch2_s3: {
    output: [{ expr: "lines(['3 items at $49 = $147', \"<class 'str'>\", \"<class 'int'>\"])" }],
    probes: [
      { expr: "type(ns.get('total')) is int and ns['total'] == 147", hint: "Turn price_text into a number with int(), multiply it by 3 and store the answer in total." },
      { expr: "'$30' in '\\n'.join(rerun({'price_text': \"'10'\"})[0])", hint: "Work out total from price_text instead of typing the answer, so it works for any price." },
    ],
  },
  ch2_boss: {
    output: [{ expr: "'power' in out.lower()", hint: "Your report needs a Power Rating: attack plus defense." }],
    probes: [
      { expr: "isinstance(ns.get('name'), str) and type(ns.get('level')) is int and type(ns.get('health')) is float", hint: "Make name some text in quotes, level a whole number, and health a number with a dot, like 100.0." },
      { expr: "ns.get('attack') == ns['level'] * 3.5 and ns.get('defense') == ns['level'] * 2 + 10", hint: "Work out attack and defense from level, using the formulas in the task." },
      { expr: "str(ns['name']) in out and numset([ns['level'], ns['health'], ns['attack'], ns['defense'], ns['attack'] + ns['defense']])", hint: "Print every stat in your report: name, level, health, attack, defense and the power rating." },
      { expr: "numset([7.0, 14, 21.0], L=rerun({'level': '2'})[0])", hint: "Work out attack, defense and power from level instead of typing the numbers." },
    ],
  },
  grind_2: {
    output: [{ expr: "has('42', \"<class 'int'>\", '3.14', \"<class 'float'>\", '100', \"<class 'str'>\")", hint: "Print each converted value followed by its type(), in the order from the task." }],
    concepts: [{ expr: "calls('int') >= 1 and calls('float') >= 1 and calls('str') >= 1", hint: "Do the converting with int(), float() and str()." }],
  },
  grind_3: {
    output: [{ expr: "nums_per_line([1, 1, 2, 6])", hint: "Print four lines, one remainder on each, for 2, 3, 5 and 7." }],
    concepts: [{ expr: "binop('Mod') >= 1", hint: "Let Python find each remainder with the % operator." }],
  },

  // ── Chapter 3: The Crossroads ──
  ch3_r1: {
    output: [{ expr: "lines(['True', 'False', 'True', 'True', 'True'])" }],
    probes: [{ expr: "rerun({'a': '3'})[0] == ['False', 'True', 'False', 'True', 'True']", hint: "Print each comparison itself, using a and b, instead of typing True or False." }],
  },
  ch3_r2: {
    output: [{ expr: "lines(['You passed!', 'Try again!'])" }],
    probes: [
      { expr: "rerun({'score': '50'})[0] == ['Try again!', 'Try again!']", hint: "Use an if/else that checks score, instead of typing the answers." },
      { expr: "rerun({'score#2': '90'})[0] == ['You passed!', 'You passed!']", hint: "Do the same if/else check again after score = 50, instead of typing the answer." },
      { expr: "rerun({'score': '70'})[0][:1] == ['You passed!']", hint: "A score of exactly 70 should pass too, so check your comparison sign." },
    ],
  },
  ch3_r3: {
    output: [{ expr: "lines(['Warm'])" }],
    probes: [{ expr: "all(rerun({'temp': t})[0] == [w] for t, w in [('95','Hot'), ('90','Hot'), ('70','Warm'), ('55','Cool'), ('50','Cool'), ('30','Cold')])", hint: "Pick the word with if/elif/else using temp, and make sure 90, 70 and 50 each land in the right group." }],
  },
  ch3_r4: {
    output: [{ expr: "lines(['Access granted'])" }],
    concepts: [{ expr: "boolop('or')", hint: "Join your two checks with or, so either one can open the gate." }],
    probes: [
      { expr: "rerun({'has_permission': 'False'})[0] == ['Access denied']", hint: "Use if/else to decide, so it says Access denied when neither check is true." },
      { expr: "rerun({'has_permission': 'False', 'age': '15'})[0] == ['Access granted']", hint: "Anyone 13 or older should get in even without permission, so check age too." },
    ],
  },
  ch3_r5: {
    output: [{ expr: "lines(['Easy win!'])" }],
    // nested_if() alone missed `if not has_sword: ... else:` with the if/else inside the else, because in the
    // ast that looks just like an elif. Only the column tells them apart: an elif starts where its if does.
    concepts: [{ expr: "nested_if() or any(isinstance(n, ast.If) and len(n.orelse) == 1 and isinstance(n.orelse[0], ast.If) and n.orelse[0].col_offset > n.col_offset for n in ast.walk(TREE))", hint: "Put an if/else inside another if, so the monster check only happens when you have a sword." }],
    probes: [
      { expr: "rerun({'monster_health': '80'})[0] == ['Tough fight!']", hint: "Check monster_health with an if, so a strong monster gives a tough fight." },
      { expr: "rerun({'has_sword': 'False'})[0] == ['You need a weapon!']", hint: "Check has_sword first, so a hero without a sword is told to find a weapon." },
    ],
  },
  ch3_s1: {
    output: [{ expr: "lines(['falsy', 'falsy', 'truthy', 'truthy', 'falsy'])" }],
    concepts: [{ expr: "any(isinstance(n, ast.If) and not isinstance(n.test, (ast.Compare, ast.BoolOp, ast.UnaryOp)) for n in ast.walk(TREE))", hint: "Test the value all by itself, with if value:, and no == or other comparison." }],
  },
  ch3_s2: {
    output: [{ expr: "lines(['minor', 'boiling', 'game over'])" }],
    concepts: [{ expr: "count(ast.IfExp) >= 3", hint: "Use the inline form for all three, like print(\"yes\" if test else \"no\")." }],
    probes: [{ expr: "rerun({'age': '20', 'temp': '50', 'lives': '3'})[0] == ['adult', 'not yet', 'keep going']", hint: "Base each answer on age, temp and lives, instead of typing the words." }],
  },
  ch3_s3: {
    output: [{ expr: "lines(['True', 'False', 'True'])" }],
    concepts: [{ expr: "chained() >= 3", hint: "Write each check as one chained comparison with x in the middle, like 0 < x < 99." }],
    probes: [
      { expr: "rerun({'x': '40'})[0] == ['True', 'True', 'True']", hint: "Compare x itself in each line, instead of typing True or False." },
      { expr: "rerun({'x': '5'})[0] == ['True', 'False', 'False']", hint: "Check your numbers: each line should test x against the range from the task." },
    ],
  },
  ch3_boss: {
    output: [{ expr: "re.search(r'\\bB\\b', out) is not None and 'Great job!' in out and not any(m in out for m in ['Excellent!', 'Not bad!', 'Needs work', 'Try harder!'])", hint: "For a score of 87, print the letter B and its message, and no other grade's message." }],
    probes: [{ expr: "all(re.search(r'\\b%s\\b' % g, '\\n'.join(rerun({'score': s})[0])) and m in '\\n'.join(rerun({'score': s})[0]) for s, g, m in [('95','A','Excellent!'), ('90','A','Excellent!'), ('75','C','Not bad!'), ('65','D','Needs work'), ('40','F','Try harder!')])", hint: "Pick the grade with if/elif/else on score, and check that a score of exactly 90 lands in the right band." }],
  },
  grind_4: {
    output: [{ expr: "re.findall(r'\\b[A-F]\\b', out) == ['C']", hint: "Print just one letter grade for a score of 73." }],
    probes: [{ expr: "all(re.findall(r'\\b[A-F]\\b', '\\n'.join(rerun({'score': s})[0])) == [g] for s, g in [('95','A'), ('90','A'), ('85','B'), ('80','B'), ('65','D'), ('10','F')])", hint: "Pick the letter with if/elif/else on score, and check that scores of exactly 90 and 80 get the right grade." }],
  },
  grind_5: {
    output: [{ expr: "[p for p in map(polarity, L) if p] == [1]", hint: "Print one line that says whether 2024 is a leap year." }],
    probes: [{ expr: "all([p for p in map(polarity, rerun({'year': y})[0]) if p] == [want] for y, want in [('1900', -1), ('2000', 1), ('2023', -1)])", hint: "Test year with the whole rule, using %, and and or, so years like 1900 and 2000 come out right too." }],
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
      { expr: "sum(isinstance(n, ast.Call) and isinstance(n.func, ast.Name) and n.func.id == 'range' and len(n.args) == 3 for n in ast.walk(TREE)) >= 2", hint: "Give range() a step both times: range(start, stop, step)." },
    ],
  },
  ch4_r3: {
    output: [{ expr: "len(L) == 6 and all(re.search(r'\\b%s\\b' % ch, l) and re.search(r'(?i)%s' % kind, l) for l, (ch, kind) in zip(L, [('p','consonant'),('y','consonant'),('t','consonant'),('h','consonant'),('o','vowel'),('n','consonant')]))", hint: "Print one line for each letter, with the letter and the word vowel or consonant." }],
    probes: [{ expr: "[('vowel' if 'vowel' in l.lower() else 'consonant' if 'consonant' in l.lower() else '?') for l in rerun({'word': \"'audio'\"})[0]] == ['vowel','vowel','consonant','vowel','vowel']", hint: "Inside the loop, use an if to decide whether each char is a vowel, instead of typing the answers." }],
  },
  ch4_r4: {
    output: [{ expr: "lines(['Energy: 10', 'Energy: 9', 'Energy: 8', 'Energy: 7', 'Energy: 6', 'Energy: 5', 'Energy: 4', 'Energy: 3', 'Energy: 2', 'Energy: 1', 'Energy: 0', 'Shutdown!'])" }],
    concepts: [{ expr: "count(ast.While) >= 1", hint: "This room is about while loops, so count the energy down with while." }],
    probes: [{ expr: "rerun({'energy': '3'})[0] == ['Energy: 3', 'Energy: 2', 'Energy: 1', 'Energy: 0', 'Shutdown!']", hint: "Count down from the energy variable in your loop, instead of typing the numbers." }],
  },
  ch4_r5: {
    output: [{ expr: "lines(['1', '3', '5', '7'])" }],
    concepts: [
      { expr: "count(ast.Continue) >= 1", hint: "Use continue to skip the even numbers." },
      { expr: "count(ast.Break) >= 1", hint: "Use break to stop the loop at the number divisible by 7." },
    ],
  },
  ch4_s1: { output: [{ expr: "lines(['*', '**', '***', '****', '*****'])" }] },
  ch4_s2: {
    output: [{ expr: "nums([5050, 33])", hint: "Print the sum first, then the count." }],
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
    concepts: [{ expr: "count(ast.For, ast.While) >= 2", hint: "Use a loop for the countdown and another for the altitudes, instead of one print per line." }],
  },
  grind_6: { output: [{ expr: "lines(['7 x 1 = 7', '7 x 2 = 14', '7 x 3 = 21', '7 x 4 = 28', '7 x 5 = 35', '7 x 6 = 42', '7 x 7 = 49', '7 x 8 = 56', '7 x 9 = 63', '7 x 10 = 70'])" }] },
  grind_7: { output: [{ expr: "lines(['1', '2', 'Fizz', '4', 'Buzz', 'Fizz', '7', '8', 'Fizz', 'Buzz', '11', 'Fizz', '13', '14', 'FizzBuzz', '16', '17', 'Fizz', '19', 'Buzz'])" }] },
};
