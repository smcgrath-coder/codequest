# Proposed run-and-check rules, chapters 1-4 (+ grind_0..7).
# out   = checks on stdout only
# probe = checks on runtime state (namespace, calling kid functions, reruns with other starter values, patched random)
# ast   = checks on source only; third tuple field says whether the TASK text or only expectedBehavior asks for it
from rules_core import E

E("ch1_r1", "deterministic", "exact", "stdout is exactly 'Hello, World!'",
  out=[("exactly one line: Hello, World!", "lines(['Hello, World!'])")],
  hard=True)

E("ch1_r2", "deterministic", "exact", "exact 3 lines in order",
  out=[("3 lines in order", "lines(['I am a coder','I am brave','I am ready'])")],
  hard=True)

E("ch1_r3", "deterministic", "exact", "stdout is exactly 'Comments help me remember'; plus a NEW comment",
  out=[("exactly: Comments help me remember", "lines(['Comments help me remember'])")],
  ast=[("has a # comment the kid wrote (the starter already contains one, so any-comment is always true)", "len(new_comments()) >= 1", "task")],
  notes="The starter line '# Write a comment above your print statement' is itself a comment, so a 'has a comment' check must ignore starter comments (tokenize, compare to starter). Comments never reach the interpreter, so this cannot be a runtime check.")

E("ch1_r4", "free-choice", "from-variables", "stdout is exactly str(hero_name); hero_name is a non-empty str; rerun with another name prints that name",
  out=[("one line equal to the value of hero_name", "L == [str(ns.get('hero_name'))]")],
  probes=[("hero_name is a non-empty string", "isinstance(ns.get('hero_name'), str) and ns['hero_name'].strip() != ''"),
          ("print uses the variable: rerun with hero_name='Zed' prints Zed", "rerun({'hero_name': \"'Zed'\"})[0] == ['Zed']")],
  notes="Free choice of name. Expected output is computed from the kid's own variable after the run.")

E("ch1_r5", "deterministic", "exact", "stdout '42'; a==15, b==27; rerun a=1,b=2 prints 3",
  out=[("exactly: 42", "lines(['42'])")],
  probes=[("a == 15 and b == 27", "ns.get('a') == 15 and ns.get('b') == 27"),
          ("sum is computed: rerun a=1, b=2 prints 3", "rerun({'a': '1', 'b': '2'})[0] == ['3']")],
  notes="print(42) alone is caught by the probes/rerun, not by output.")

E("ch1_r6", "free-choice", "from-variables", "stdout exactly f'I love {food} so much!' using the kid's food; f-string used",
  out=[("one line: I love <food> so much!", "L == [f\"I love {ns.get('food')} so much!\"]")],
  probes=[("food is a non-empty string", "isinstance(ns.get('food'), str) and ns['food'].strip() != ''"),
          ("rerun food='tacos' prints I love tacos so much!", "rerun({'food': \"'tacos'\"})[0] == ['I love tacos so much!']")],
  ast=[("uses an f-string", "fstrings() >= 1", "task")],
  notes="f-string vs + concatenation vs .format() produce identical output; only the AST can tell.")

E("ch1_s1", "deterministic", "exact", "exact 3 lines; exactly one print() call, not in a loop, with \\n in a string",
  out=[("3 lines in order", "lines(['Roses are red','Violets are blue','Python is fun'])")],
  ast=[("exactly one print() call", "calls('print') == 1", "task"),
       ("the print is not inside a loop", "not loop_calls('print')", "task"),
       ("a string literal contains \\n", "any('\\n' in s for s in str_consts())", "expectedBehavior")],
  notes="Three print() calls give identical stdout; the 'ONE print()' rule is structural only.")

E("ch1_s2", "free-choice", "from-variables", "stdout exactly greeting + ', ' + name + '! Welcome to CodeQuest.'; no f-string; uses +",
  out=[("one line built from the kid's variables", "L == [f\"{ns.get('greeting')}, {ns.get('name')}! Welcome to CodeQuest.\"]")],
  probes=[("greeting == 'Hello' and name is a non-empty string", "ns.get('greeting') == 'Hello' and isinstance(ns.get('name'), str) and ns['name'].strip() != ''"),
          ("rerun name='Zed' prints Hello, Zed! Welcome to CodeQuest.", "rerun({'name': \"'Zed'\"})[0] == ['Hello, Zed! Welcome to CodeQuest.']")],
  ast=[("does NOT use an f-string", "fstrings() == 0", "task"),
       ("uses + concatenation", "binop('Add') >= 1", "task")],
  notes="A forbidden construct (f-string) is invisible in output; AST required.")

E("ch1_s3", "deterministic", "values-fixed-wording-free", "numbers 3, 72, 4320, 259200 appear in order with labels; rerun days=1 gives 1, 24, 1440, 86400; f-string used",
  out=[("values 3, 72, 4320, 259200 appear in order", "nums([3, 72, 4320, 259200])"),
       ("labels present (hour/minute/second words)", "bool(re.search(r'(?i)h(ou)?r', out) and re.search(r'(?i)min', out) and re.search(r'(?i)sec', out))")],
  probes=[("chained from days: rerun days=1 prints 1, 24, 1440, 86400", "nums([1, 24, 1440, 86400], L=rerun({'days': '1'})[0])")],
  ast=[("uses f-strings", "fstrings() >= 1", "task")])

E("ch1_boss", "free-choice", "pattern", "one line matching 'My name is (.+), I am (.+), and I love (.+)' whose 3 values are the kid's variables; f-string used",
  out=[("one line: My name is X, I am Y, and I love Z", "len(L) == 1 and re.fullmatch(r'My name is (.+), I am (.+), and I love (.+)', L[0]) is not None")],
  probes=[("each of X, Y, Z is the str() of one of the kid's variables",
           "all(any(str(v) == cap for k, v in ns.items() if not k.startswith('__')) for cap in re.fullmatch(r'My name is (.+), I am (.+), and I love (.+)', L[0]).groups())")],
  ast=[("uses an f-string", "fstrings() >= 1", "task")],
  notes="Variable names are not fixed by the task (name/age/game or favorite_game), so the probe matches captured values against any global.")

E("grind_0", "deterministic", "exact", "exact 4-line box",
  out=[("exact box", "lines(['####','#  #','#  #','####'])")], hard=True)

E("grind_1", "free-choice", "from-variables", "stdout exactly f'The {animal} ate {number} {food}s' from the kid's variables",
  out=[("one line built from animal/number/food", "L == [f\"The {ns.get('animal')} ate {ns.get('number')} {ns.get('food')}s\"]")],
  probes=[("animal, food, number all defined", "all(k in ns for k in ('animal', 'food', 'number'))"),
          ("rerun animal='dog' changes the line", "rerun({'animal': \"'dog'\"})[0][:1] and rerun({'animal': \"'dog'\"})[0][0].startswith('The dog ate')")],
  notes="expectedBehavior says 'use f-string' but the task text does not; no f-string check proposed (list it if you want parity with expectedBehavior).")

E("ch2_r1", "free-choice", "exact", "exact lines <class 'str'>, <class 'int'>, <class 'float'>; variables have those types",
  out=[("exact 3 type lines", "lines([\"<class 'str'>\", \"<class 'int'>\", \"<class 'float'>\"])")],
  probes=[("word is str, whole is int (not bool), decimal is float", "type(ns.get('word')) is str and type(ns.get('whole')) is int and type(ns.get('decimal')) is float")],
  notes="Values are free, output is not.")

E("ch2_r2", "deterministic", "values-fixed-wording-free", "6 lines; line k contains 15, 5, 50, 3.3333333333333335, 3, 16",
  out=[("6 lines with the 6 results in order", "nums_per_line([15, 5, 50, 10/3, 3, 16])")],
  ast=[("uses + - * / // ** operators", "all(binop(op) >= 1 for op in ('Add','Sub','Mult','Div','FloorDiv','Pow'))", "task")],
  notes="Kids may print labels ('10 + 5 = 15'); per-line numeric match allows that. round(10/3, 2) would fail (task asks for 10 / 3). Output identical in CPython 3.13 and Pyodide 3.14 (measured).")

E("ch2_r3", "deterministic", "exact", "exact lines THE VAULT AWAITS / the quest awaits / 16; rerun with another message",
  out=[("exact 3 lines", "lines(['THE VAULT AWAITS', 'the quest awaits', '16'])")],
  probes=[("rerun message='a vault b' gives A VAULT B / a quest b / 9", "rerun({'message': \"'a vault b'\"})[0] == ['A VAULT B', 'a quest b', '9']")],
  notes="The rerun proves .upper()/.replace()/len() are applied to the variable, so no method-name AST check is needed.")

E("ch2_r4", "deterministic", "exact", "stdout 'The code is 57'; code == 57 computed with //; f-string",
  out=[("exactly: The code is 57", "lines(['The code is 57'])")],
  probes=[("code == 57", "ns.get('code') == 57")],
  ast=[("uses an f-string", "fstrings() >= 1", "task"),
       ("code is computed (contains //), not typed as 57", "binop('FloorDiv') >= 1 and binop('Mult') >= 1", "task")],
  notes="code = 57 typed by hand gives identical output and state.")

E("ch2_r5", "deterministic", "values-fixed-wording-free", "values 100, 10.0, 110.0 in order, each line labelled; variables correct; rerun price=10 gives 40, 4.0, 44.0",
  out=[("values 100, 10.0, 110.0 in order", "nums([100, 10.0, 110.0])"),
       ("every line has a label", "len(L) >= 3 and all(re.search('[A-Za-z]', l) for l in L)")],
  probes=[("subtotal == 100, tax == 10.0, total == 110.0", "ns.get('subtotal') == 100 and ns.get('tax') == 10.0 and ns.get('total') == 110.0"),
          ("rerun price=10 gives 40, 4.0, 44.0", "nums([40, 4.0, 44.0], L=rerun({'price': '10'})[0])")])

E("ch2_s1", "deterministic", "pattern", "3 lines: 15 ... odd, 42 ... even, 7 ... odd; uses %",
  out=[("15 odd, 42 even, 7 odd in order", "subseq([r're:(?i).*\\b15\\b.*\\bodd\\b.*', r're:(?i).*\\b42\\b.*\\beven\\b.*', r're:(?i).*\\b7\\b.*\\bodd\\b.*'])"),
       ("no line claims the wrong parity", "not re.search(r'(?i)\\b15\\b.*\\beven|\\b42\\b.*\\bodd|\\b7\\b.*\\beven', out)")],
  ast=[("uses the % operator", "binop('Mod') >= 1", "task")],
  notes="No starter variables, so no rerun is possible; hardcoded strings pass output, % check is structural.")

E("ch2_s2", "deterministic", "exact", "exact CodeCodeCode / C / e / 20 dashes; rerun word='Robot'",
  out=[("exact 4 lines", "lines(['CodeCodeCode', 'C', 'e', '-' * 20])")],
  probes=[("rerun word='Robot' gives RobotRobotRobot / R / t / dashes", "rerun({'word': \"'Robot'\"})[0] == ['RobotRobotRobot', 'R', 't', '-' * 20]")])

E("ch2_s3", "deterministic", "exact", "exact '3 items at $49 = $147', <class 'str'>, <class 'int'>; total is int 147",
  out=[("exact 3 lines", "lines(['3 items at $49 = $147', \"<class 'str'>\", \"<class 'int'>\"])")],
  probes=[("total == 147 and is an int", "type(ns.get('total')) is int and ns['total'] == 147"),
          ("rerun price_text='10' gives total 30", "'$30' in '\\n'.join(rerun({'price_text': \"'10'\"})[0])")],
  notes="Kids may hardcode '$49' in the f-string (fine); rerun only checks the computed total.")

E("ch2_boss", "free-choice", "values-from-variables", "report shows name, level, health, attack, defense, power (attack+defense) of the kid's own values; rerun level=2",
  out=[("the word Power appears", "'power' in out.lower()")],
  probes=[("name str, level int, health float", "isinstance(ns.get('name'), str) and type(ns.get('level')) is int and type(ns.get('health')) is float"),
          ("attack == level*3.5 and defense == level*2+10", "ns.get('attack') == ns['level'] * 3.5 and ns.get('defense') == ns['level'] * 2 + 10"),
          ("all 6 values appear in stdout", "str(ns['name']) in out and numset([ns['level'], ns['health'], ns['attack'], ns['defense'], ns['attack'] + ns['defense']])"),
          ("rerun level=2 shows 7.0, 14, 21.0", "numset([7.0, 14, 21.0], L=rerun({'level': '2'})[0])")])

E("grind_2", "deterministic", "values-fixed-wording-free", "42 <class 'int'>, 3.14 <class 'float'>, 100 <class 'str'> in order (one or two lines each)",
  out=[("values and types in order", "has('42', \"<class 'int'>\", '3.14', \"<class 'float'>\", '100', \"<class 'str'>\")")],
  ast=[("calls int(), float(), str() to convert", "calls('int') >= 1 and calls('float') >= 1 and calls('str') >= 1", "task")],
  notes="whole = 42 (literal) gives the same output as int('42'); conversion is structural.")

E("grind_3", "deterministic", "values-fixed-wording-free", "4 lines containing 1, 1, 2, 6; uses %",
  out=[("4 lines with remainders 1, 1, 2, 6", "nums_per_line([1, 1, 2, 6])")],
  ast=[("uses the % operator", "binop('Mod') >= 1", "task")])

E("ch3_r1", "deterministic", "exact", "exact True False True True True; rerun a=3 gives False True False True True",
  out=[("exact 5 booleans", "lines(['True', 'False', 'True', 'True', 'True'])")],
  probes=[("rerun a=3 gives False, True, False, True, True", "rerun({'a': '3'})[0] == ['False', 'True', 'False', 'True', 'True']")])

E("ch3_r2", "deterministic", "exact", "exact You passed! / Try again!; reruns flip each result",
  out=[("exact 2 lines", "lines(['You passed!', 'Try again!'])")],
  probes=[("rerun first score=50 gives Try again! twice", "rerun({'score': '50'})[0] == ['Try again!', 'Try again!']"),
          ("rerun second score=90 gives You passed! twice", "rerun({'score#2': '90'})[0] == ['You passed!', 'You passed!']"),
          ("boundary: score=70 passes", "rerun({'score': '70'})[0][:1] == ['You passed!']")],
  notes="Reruns with other starter values prove a real condition, so no AST if/else check is needed.")

E("ch3_r3", "deterministic", "exact", "exact 'Warm'; reruns temp=95/90/70/55/50/30 give Hot/Hot/Warm/Cool/Cool/Cold",
  out=[("exactly: Warm", "lines(['Warm'])")],
  probes=[("reruns hit every branch and boundary",
           "all(rerun({'temp': t})[0] == [w] for t, w in [('95','Hot'), ('90','Hot'), ('70','Warm'), ('55','Cool'), ('50','Cool'), ('30','Cold')])")])

E("ch3_r4", "deterministic", "exact", "exact 'Access granted'; reruns cover both operands; uses or",
  out=[("exactly: Access granted", "lines(['Access granted'])")],
  probes=[("has_permission=False, age=12 gives Access denied", "rerun({'has_permission': 'False'})[0] == ['Access denied']"),
          ("has_permission=False, age=15 gives Access granted", "rerun({'has_permission': 'False', 'age': '15'})[0] == ['Access granted']")],
  ast=[("condition uses or", "boolop('or')", "task")])

E("ch3_r5", "deterministic", "exact", "exact 'Easy win!'; reruns hit the other 2 branches; nested if",
  out=[("exactly: Easy win!", "lines(['Easy win!'])")],
  probes=[("monster_health=80 gives Tough fight!", "rerun({'monster_health': '80'})[0] == ['Tough fight!']"),
          ("has_sword=False gives You need a weapon!", "rerun({'has_sword': 'False'})[0] == ['You need a weapon!']")],
  ast=[("uses an if nested inside an if/else", "nested_if()", "task")])

E("ch3_s1", "deterministic", "exact", "exact falsy falsy truthy truthy falsy; uses 'if value:' truthiness test",
  out=[("exact 5 lines", "lines(['falsy', 'falsy', 'truthy', 'truthy', 'falsy'])")],
  ast=[("an if tests a bare value (no comparison)", "any(isinstance(n, ast.If) and not isinstance(n.test, (ast.Compare, ast.BoolOp, ast.UnaryOp)) for n in ast.walk(TREE))", "task")],
  notes="The reference re-assigns value 5 times instead of looping over values_to_test, so a rerun with another list is not usable.")

E("ch3_s2", "deterministic", "exact", "exact minor / boiling / game over; reruns flip each; 3 inline if/else",
  out=[("exact 3 lines", "lines(['minor', 'boiling', 'game over'])")],
  probes=[("rerun age=20, temp=50, lives=3 gives adult / not yet / keep going", "rerun({'age': '20', 'temp': '50', 'lives': '3'})[0] == ['adult', 'not yet', 'keep going']")],
  ast=[("at least 3 inline if/else (ternary) expressions", "count(ast.IfExp) >= 3", "task")])

E("ch3_s3", "deterministic", "exact", "exact True False True; reruns x=40 and x=5; 3 chained comparisons",
  out=[("exact 3 lines", "lines(['True', 'False', 'True'])")],
  probes=[("rerun x=40 gives True True True", "rerun({'x': '40'})[0] == ['True', 'True', 'True']"),
          ("rerun x=5 gives True False False", "rerun({'x': '5'})[0] == ['True', 'False', 'False']")],
  ast=[("3 chained comparisons (a < x < b)", "chained() >= 3", "task")])

E("ch3_boss", "deterministic", "values-fixed-wording-free", "grade B and 'Great job!' (grade line wording free); reruns cover all 5 bands",
  out=[("letter B and Great job!, no other band message", "re.search(r'\\bB\\b', out) is not None and 'Great job!' in out and not any(m in out for m in ['Excellent!', 'Not bad!', 'Needs work', 'Try harder!'])")],
  probes=[("reruns 95/90/75/65/40 give A/A/C/D/F with their messages",
           "all(re.search(r'\\b%s\\b' % g, '\\n'.join(rerun({'score': s})[0])) and m in '\\n'.join(rerun({'score': s})[0]) for s, g, m in [('95','A','Excellent!'), ('90','A','Excellent!'), ('75','C','Not bad!'), ('65','D','Needs work'), ('40','F','Try harder!')])")])

E("grind_4", "deterministic", "values-fixed-wording-free", "the only grade letter printed is C; reruns cover A B D F and boundaries",
  out=[("single grade letter C", "re.findall(r'\\b[A-F]\\b', out) == ['C']")],
  probes=[("reruns 95/90/85/80/65/10 give A/A/B/B/D/F",
           "all(re.findall(r'\\b[A-F]\\b', '\\n'.join(rerun({'score': s})[0])) == [g] for s, g in [('95','A'), ('90','A'), ('85','B'), ('80','B'), ('65','D'), ('10','F')])")])

E("grind_5", "deterministic", "values-fixed-wording-free", "says 2024 IS a leap year; reruns 1900 (not), 2000 (is), 2023 (not)",
  out=[("one affirmative answer", "[p for p in map(polarity, L) if p] == [1]")],
  probes=[("reruns 1900/2000/2023 give not/is/not", "all([p for p in map(polarity, rerun({'year': y})[0]) if p] == [want] for y, want in [('1900', -1), ('2000', 1), ('2023', -1)])")],
  notes="Wording free ('2024 is a leap year', 'True', 'Yes'); polarity = contains not/false/no vs leap/true/yes.")

E("ch4_r1", "deterministic", "exact", "exact Step 0..Step 4; for loop with range",
  out=[("exact 5 lines", "lines(['Step %d' % i for i in range(5)])")],
  ast=[("uses a for loop", "count(ast.For) >= 1", "task"),
       ("calls range()", "calls('range') >= 1", "expectedBehavior")])

E("ch4_r2", "deterministic", "exact", "exact 2 4 6 8 10 5 4 3 2 1; two range() calls with a step",
  out=[("exact 10 lines", "lines(['2','4','6','8','10','5','4','3','2','1'])")],
  ast=[("at least 2 for loops", "count(ast.For) >= 2", "task"),
       ("range() with 3 arguments used twice", "sum(isinstance(n, ast.Call) and isinstance(n.func, ast.Name) and n.func.id == 'range' and len(n.args) == 3 for n in ast.walk(TREE)) >= 2", "task")])

E("ch4_r3", "deterministic", "pattern", "6 lines, letter + vowel/consonant each (y is a consonant); rerun word='audio'",
  out=[("p y t h consonant, o vowel, n consonant",
        "len(L) == 6 and all(re.search(r'\\b%s\\b' % ch, l) and re.search(r'(?i)%s' % kind, l) for l, (ch, kind) in zip(L, [('p','consonant'),('y','consonant'),('t','consonant'),('h','consonant'),('o','vowel'),('n','consonant')]))")],
  probes=[("rerun word='audio' gives vowel vowel consonant vowel vowel", "[('vowel' if 'vowel' in l.lower() else 'consonant' if 'consonant' in l.lower() else '?') for l in rerun({'word': \"'audio'\"})[0]] == ['vowel','vowel','consonant','vowel','vowel']")],
  notes="The for loop is already in the starter; the rerun proves the body classifies each character.")

E("ch4_r4", "deterministic", "exact", "exact Energy: 10..0 then Shutdown!; rerun energy=3; while loop",
  out=[("exact 12 lines", "lines(['Energy: %d' % i for i in range(10, -1, -1)] + ['Shutdown!'])")],
  probes=[("rerun energy=3 gives Energy: 3..0, Shutdown!", "rerun({'energy': '3'})[0] == ['Energy: 3', 'Energy: 2', 'Energy: 1', 'Energy: 0', 'Shutdown!']")],
  ast=[("uses a while loop", "count(ast.While) >= 1", "task")],
  loop=("high", "Forgetting 'energy -= 1' loops forever while printing (measured: 12.0M lines / 132 MB in 2 s under CPython). Off-by-one (> 0) terminates."))

E("ch4_r5", "deterministic", "exact", "exact 1 3 5 7; uses continue and break",
  out=[("exact 4 lines", "lines(['1', '3', '5', '7'])")],
  ast=[("uses continue", "count(ast.Continue) >= 1", "task"),
       ("uses break", "count(ast.Break) >= 1", "task")],
  loop=("medium", "Starter is a for loop (safe). A kid who rewrites it as while with 'continue' before 'i += 1' loops forever silently (measured: 0 bytes output, killed at 2 s)."),
  notes="range(1, 21) is a literal in the starter, so there is no variable to rerun with.")

E("ch4_s1", "deterministic", "exact", "exact triangle 1..5 stars; uses a loop",
  out=[("exact 5 lines", "lines(['*' * i for i in range(1, 6)])")],
  ast=[("uses a for or while loop", "count(ast.For, ast.While) >= 1", "expectedBehavior")],
  notes="Task text only hints at a loop ('the row number controls how many stars'); expectedBehavior says 'using loops'.")

E("ch4_s2", "deterministic", "values-fixed-wording-free", "5050 and 33 appear (labels free); total == 5050, count == 33",
  out=[("5050 then 33", "nums([5050, 33])")],
  probes=[("total == 5050 and count == 33", "ns.get('total') == 5050 and ns.get('count') == 33")],
  notes="The loop header is in the starter; accumulator state is checked at runtime.")

E("ch4_s3", "deterministic", "exact", "exact Trying: java/ruby/python, Access granted!; reruns with other passwords; uses break",
  out=[("exact 4 lines", "lines(['Trying: java', 'Trying: ruby', 'Trying: python', 'Access granted!'])")],
  probes=[("rerun password='ruby' stops after ruby", "rerun({'password': \"'ruby'\"})[0] == ['Trying: java', 'Trying: ruby', 'Access granted!']"),
          ("rerun password='java' stops after java", "rerun({'password': \"'java'\"})[0] == ['Trying: java', 'Access granted!']")],
  ast=[("uses break", "count(ast.Break) >= 1", "task")])

E("ch4_boss", "deterministic", "exact", "exact 10 9 8 6 5 4 3 2 1 LIFTOFF! Altitude: 100..500; at least 2 loops",
  out=[("exact 15 lines", "lines(['10','9','8','6','5','4','3','2','1','LIFTOFF!'] + ['Altitude: %d' % a for a in range(100, 501, 100)])")],
  ast=[("at least 2 loops (task: 'Use loops for everything!')", "count(ast.For, ast.While) >= 2", "task"),
       ("uses continue to skip 7", "count(ast.Continue) >= 1", "expectedBehavior")],
  loop=("medium", "Titled 'The Infinite Loop'; a while-based countdown that forgets to decrement, or that 'continue's at 7 before decrementing, never ends."))

E("grind_6", "deterministic", "exact", "exact 7 x 1 = 7 .. 7 x 10 = 70; uses a loop",
  out=[("exact 10 lines", "lines(['7 x %d = %d' % (i, 7 * i) for i in range(1, 11)])")],
  ast=[("uses a for loop", "count(ast.For, ast.While) >= 1", "expectedBehavior")],
  notes="Task text does not say 'loop'; expectedBehavior does.")

E("grind_7", "deterministic", "exact", "exact FizzBuzz 1..20; uses a loop",
  out=[("exact 20 lines", "lines(['FizzBuzz' if i % 15 == 0 else 'Fizz' if i % 3 == 0 else 'Buzz' if i % 5 == 0 else str(i) for i in range(1, 21)])")],
  ast=[("uses a loop", "count(ast.For, ast.While) >= 1", "expectedBehavior")])
