# Proposed run-and-check rules, chapters 5-8 (+ grind_8..15).
from rules_core import E

E("ch5_r1", "free-choice", "from-variables", "lines are favorites[0], favorites[-1], favorites[1], 4 from the kid's own list; rerun with another list",
  out=[("4 lines from the kid's list", "isinstance(ns.get('favorites'), list) and L == [str(ns['favorites'][0]), str(ns['favorites'][-1]), str(ns['favorites'][1]), '4']")],
  probes=[("favorites is a list of 4", "isinstance(ns.get('favorites'), list) and len(ns['favorites']) == 4"),
          ("rerun favorites=[a,b,c,d] gives a d b 4", "rerun({'favorites': \"['a','b','c','d']\"})[0] == ['a', 'd', 'b', '4']")])

E("ch5_r2", "deterministic", "exact", "final list ['Alpha', 'Arch', 'Beta', 'Code'] printed; rerun with another start list proves append/insert/remove/sort",
  out=[("final list printed", "has(\"['Alpha', 'Arch', 'Beta', 'Code']\") or has('Alpha', 'Arch', 'Beta', 'Code')")],
  probes=[("books == ['Alpha','Arch','Beta','Code']", "ns.get('books') == ['Alpha', 'Arch', 'Beta', 'Code']"),
          ("rerun books=['Zed','Dragon'] ends as ['Alpha','Beta','Zed']", "rerun({'books': \"['Zed', 'Dragon']\"})[1].ns.get('books') == ['Alpha', 'Beta', 'Zed']")],
  notes="The rerun replaces the starter list, so typing the final list by hand fails; no method-name AST check needed.")

E("ch5_r3", "deterministic", "pattern", "6 lines: score + Pass/Fail at >= 70; rerun scores=[70, 69]",
  out=[("each score with Pass (>=70) or Fail", "len(L) == 6 and all(str(s) in l and (('pass' in l.lower()) == (s >= 70)) and (('fail' in l.lower()) == (s < 70)) for l, s in zip(L, [85, 42, 91, 67, 73, 55]))")],
  probes=[("rerun scores=[70, 69] gives 70 Pass, 69 Fail", "[('pass' in l.lower(), '70' in l or '69' in l) for l in rerun({'scores': '[70, 69]'})[0]] == [(True, True), (False, True)]")])

E("ch5_r4", "deterministic", "values-fixed-wording-free", "first 3, last 2, middle, count 6 in order; rerun with 7 items",
  out=[("slices and count in order (middle = [2:4] or [2:5])",
        "has(\"['map', 'torch', 'key']\", \"['scroll', 'ring']\") and (has(\"['key', 'gem']\") or has(\"['key', 'gem', 'scroll']\")) and nums([6])")],
  probes=[("rerun with a..g gives [a,b,c], [f,g], [c,d] or [c,d,e], 7",
           "(lambda t: has(\"['a', 'b', 'c']\", \"['f', 'g']\", L=t) and (has(\"['c', 'd']\", L=t)) and nums([7], L=t))(rerun({'items': \"['a','b','c','d','e','f','g']\"})[0])")],
  notes="Task says 'middle items (index 2 to 4)': [2:4] (expectedBehavior) gives key, gem; a kid reading 'to 4' inclusively writes [2:5]. Rule accepts both.")

E("ch5_r5", "deterministic", "exact", "long_words == ['quick','jumps','over','lazy'] printed with 4; rerun; loop + append",
  out=[("list and its length", "has(\"['quick', 'jumps', 'over', 'lazy']\") and nums([4])")],
  probes=[("long_words correct", "ns.get('long_words') == ['quick', 'jumps', 'over', 'lazy']"),
          ("rerun words=['hello','hi','world'] gives ['hello','world']", "rerun({'words': \"['hello', 'hi', 'world']\"})[1].ns.get('long_words') == ['hello', 'world']")],
  ast=[("builds the list with append inside a loop", "loop_calls('append')", "expectedBehavior")],
  notes="A list comprehension is behaviourally identical; only expectedBehavior (not the task) demands loop+append.")

E("ch5_s1", "deterministic", "pattern", "Python yes, Ruby no, Games yes, Math no (wording free); rerun with another library; uses in",
  out=[("yes/no answers in order", "[p for p in map(polarity, L) if p] == [1, -1, 1, -1]")],
  probes=[("rerun library=['Ruby','Math'] flips all four", "[p for p in map(polarity, rerun({'library': \"['Ruby', 'Math']\"})[0]) if p] == [-1, 1, -1, 1]")],
  ast=[("uses the in operator", "any(isinstance(n, ast.Compare) and any(isinstance(o, (ast.In, ast.NotIn)) for o in n.ops) for n in ast.walk(TREE))", "expectedBehavior")],
  notes="Kids may print 'Python: Found!' or just True/False; polarity (found/true vs not/false) handles both.")

E("ch5_s2", "deterministic", "exact", "exact 0: Link .. 3: Kirby; rerun heroes; uses enumerate",
  out=[("exact 4 lines", "lines(['0: Link', '1: Mario', '2: Samus', '3: Kirby'])")],
  probes=[("rerun heroes=['A','B'] gives 0: A, 1: B", "rerun({'heroes': \"['A', 'B']\"})[0] == ['0: A', '1: B']")],
  ast=[("calls enumerate()", "calls('enumerate') >= 1", "task")])

E("ch5_s3", "deterministic", "exact", "exact [2, 4, 6, 8, 10] and ['hello', 'howdy']; 2 list comprehensions",
  out=[("both lists printed", "has('[2, 4, 6, 8, 10]', \"['hello', 'howdy']\")")],
  probes=[("doubles and long have the right values", "ns.get('doubles') == [2, 4, 6, 8, 10] and ns.get('long') == ['hello', 'howdy']")],
  ast=[("at least 2 list comprehensions", "count(ast.ListComp) >= 2", "task")])

E("ch5_boss", "deterministic", "exact", "Sword x1, Potion x5, Arrow x20, Gem x3, total 29; parallel lists updated; rerun with Shield elsewhere",
  out=[("4 item lines then total 29", "len(L) >= 5 and L[:4] == ['Sword x1', 'Potion x5', 'Arrow x20', 'Gem x3'] and nums([29], L=L[4:])")],
  probes=[("inventory and counts updated in parallel", "ns.get('inventory') == ['Sword', 'Potion', 'Arrow', 'Gem'] and ns.get('counts') == [1, 5, 20, 3]"),
          ("rerun inventory=['Shield','Bow'], counts=[2,7] gives Bow x7, Gem x3, total 10",
           "(lambda t: t[:2] == ['Bow x7', 'Gem x3'] and nums([10], L=t[2:]))(rerun({'inventory': \"['Shield', 'Bow']\", 'counts': '[2, 7]'})[0])")],
  notes="The rerun moves Shield to index 0, so a hardcoded pop(1) fails; that is how 'find its index' is verified at runtime.")

E("grind_8", "deterministic", "exact", "[12, 23, 17, 21] and 4; rerun numbers=[11, 3, 50]",
  out=[("filtered list and its length", "has('[12, 23, 17, 21]') and nums([4], L=L[-1:])")],
  probes=[("rerun numbers=[11, 3, 50] gives [11, 50] and 2", "(lambda t: has('[11, 50]', L=t) and nums([2], L=t[-1:]))(rerun({'numbers': '[11, 3, 50]'})[0])")])

E("grind_9", "deterministic", "exact", "[5, 4, 3, 2, 1]; rerun original=[7, 8, 9]; no .reverse(), uses a loop",
  out=[("reversed list", "has('[5, 4, 3, 2, 1]')")],
  probes=[("rerun original=[7, 8, 9] gives [9, 8, 7]", "has('[9, 8, 7]', L=rerun({'original': '[7, 8, 9]'})[0])")],
  ast=[("does not call .reverse()", "calls('reverse') == 0", "task"),
       ("builds it with a loop", "count(ast.For, ast.While) >= 1", "task")],
  notes="reversed() or [::-1] are not forbidden by the task text; add 'calls(\"reversed\") == 0 and not has_slice_step()' if the lesson intends that.")

E("ch6_r1", "free-choice", "free-text", "3 identical non-empty lines produced by battle_cry(); battle_cry takes no parameters and was called 3 times",
  out=[("3 identical non-empty lines", "len(L) == 3 and L[0].strip() != '' and L[0] == L[1] == L[2]")],
  probes=[("battle_cry is a function with 0 parameters", "sig('battle_cry') == (0, 0)"),
          ("battle_cry() prints the war cry", "call('battle_cry()')[1] == L[:1]"),
          ("battle_cry was called 3 times", "trace.count('battle_cry') == 3")],
  notes="The war cry text is the kid's choice; the call trace proves 3 calls even when they are made in a loop.")

E("ch6_r2", "free-choice", "pattern", "3 distinct lines '<name> — Level <level>' made by hero_status; 2 parameters; called 3 times",
  out=[("3 distinct lines like '<name> - Level <n>'", "len(L) == 3 and len(set(L)) == 3 and all(re.fullmatch(r'.+?\\s*[—–-]+\\s*Level\\s+\\S+', l) for l in L)")],
  probes=[("hero_status has 2 parameters", "sig('hero_status') == (2, 0)"),
          ("hero_status('Zed', 99) prints Zed and 99", "(lambda t: len(t) == 1 and 'Zed' in t[0] and '99' in t[0])(call(\"hero_status('Zed', 99)\")[1])"),
          ("called 3 times", "trace.count('hero_status') == 3")],
  notes="The task uses an em dash; kids will type '-', so the pattern accepts any dash.")

E("ch6_r3", "free-choice", "pattern", "one line 'Damage dealt: <n>' where n is a stored result; calculate_damage returns base*multiplier",
  out=[("one line: Damage dealt: <value>", "len(L) == 1 and re.fullmatch(r'Damage dealt: (\\S+)', L[0]) is not None")],
  probes=[("calculate_damage returns (not prints) base * multiplier", "call('calculate_damage(4, 5)') == (20, []) and val('calculate_damage(3, 0.5)') == 1.5"),
          ("the printed value is stored in a global variable", "any(str(v) == L[0].split(': ', 1)[1] for k, v in ns.items() if not k.startswith('__') and not callable(v))")])

E("ch6_r4", "free-choice", "pattern", "one line '<name> gained 10 power!' and one with a custom amount; power_up has a default of 10",
  out=[("a default-amount line and a custom-amount line", "any(re.fullmatch(r'.+ gained 10 power!', l) for l in L) and any(re.fullmatch(r'.+ gained (?!10 )-?\\d+(\\.\\d+)? power!', l) for l in L)")],
  probes=[("power_up(name, amount=10) signature", "sig('power_up') == (2, 1)"),
          ("power_up('Zed') returns 'Zed gained 10 power!'", "call(\"power_up('Zed')\")[0] == 'Zed gained 10 power!'"),
          ("power_up('Zed', 7) returns 'Zed gained 7 power!'", "val(\"power_up('Zed', 7)\") == 'Zed gained 7 power!'")],
  notes="Task says the function RETURNS the text and never says print it; the output check assumes the kid prints both calls (the reference does). If the kid picks 10 as the 'custom' amount, the output check fails; a call-site AST check (one call with 1 arg, one with 2) is the alternative.")

E("ch6_r5", "deterministic", "values-fixed-wording-free", "87.6 and 95 printed; analyze_scores returns (average, highest); values unpacked into two globals; rerun scores=[10, 20]",
  out=[("average 87.6 then highest 95", "nums([87.6, 95])")],
  probes=[("analyze_scores([1, 2, 3]) returns (2.0, 3)", "val('analyze_scores([1, 2, 3])') == (2.0, 3)"),
          ("both values unpacked into globals", "87.6 in [v for k, v in ns.items() if not k.startswith('__') and isinstance(v, float)] and any(v == 95 and type(v) is int for k, v in ns.items() if not k.startswith('__'))"),
          ("rerun scores=[10, 20] prints 15.0 and 20", "nums([15.0, 20], L=rerun({'scores': '[10, 20]'})[0])")])

E("ch6_s1", "deterministic", "values-fixed-wording-free", "10, 30, 55 (labels free); power_rating calls calc_attack and calc_defense",
  out=[("3 lines with 10, 30, 55", "nums_per_line([10, 30, 55])")],
  probes=[("calc_attack(2)=6, calc_defense(2)=9, power_rating(2)=15", "val('calc_attack(2)') == 6 and val('calc_defense(2)') == 9 and val('power_rating(2)') == 15"),
          ("power_rating calls both helpers", "called_from('calc_attack', 'power_rating') and called_from('calc_defense', 'power_rating')")])

E("ch6_s2", "deterministic", "exact", "help() text for calculate_area(width, height) including the kid's docstring; returns width*height",
  out=[("help() output for calculate_area", "has('Help on function calculate_area', 'calculate_area(width, height)')"),
       ("the docstring text is shown", "isinstance(ns.get('calculate_area'), type(lambda: 0)) and bool(ns['calculate_area'].__doc__) and ns['calculate_area'].__doc__.strip().splitlines()[0].strip() in out")],
  probes=[("calculate_area(3, 4) == 12", "val('calculate_area(3, 4)') == 12"),
          ("has a docstring (runtime __doc__)", "bool((ns['calculate_area'].__doc__ or '').strip())")],
  notes="Measured: help() works in Pyodide 314.0.7 and prints the same text as CPython 3.13; the first call takes ~108 ms (imports pydoc). Docstring quality ('explaining what it does') is not checkable.")

E("ch6_s3", "deterministic", "values-fixed-wording-free", "local 50 printed before global 100; global score stays 100; a function assigns a local score and no global statement",
  out=[("50 printed, then 100", "len(L) == 2 and nums([50], L=L[:1]) and nums([100], L=L[1:])")],
  probes=[("global score == 100", "ns.get('score') == 100")],
  ast=[("a function assigns score locally", "any_func_assigns('score')", "task"),
       ("no global statement", "count(ast.Global) == 0", "task")],
  notes="print(50); print(100) with no function is indistinguishable by output or final state.")

E("ch6_boss", "free-choice", "values-from-variables", "hero_report prints name, attack, defense, total for the kid's sample values; helpers correct; hero_report calls both",
  out=[("report printed", "len(L) >= 3")],
  probes=[("calc_attack(3, 4) == 10 and calc_defense(4, 2) == 7.0", "val('calc_attack(3, 4)') == 10 and val('calc_defense(4, 2)') == 7.0"),
          ("hero_report takes 5 parameters", "sig('hero_report') == (5, 0)"),
          ("hero_report('Zed', 3, 4, 4, 2) prints Zed, 10, 7.0, 17.0", "(lambda t: 'Zed' in '\\n'.join(t) and numset([10, 7.0, 17.0], L=t))(call(\"hero_report('Zed', 3, 4, 4, 2)\")[1])"),
          ("hero_report calls calc_attack and calc_defense", "called_from('calc_attack', 'hero_report') and called_from('calc_defense', 'hero_report')")],
  notes="The task names a parameter 'str', which shadows the builtin; a kid who then calls str() inside hero_report gets TypeError. Worth renaming in content.")

E("grind_10", "deterministic", "values-fixed-wording-free", "32.0 and 100.0 printed; both converters correct on other inputs",
  out=[("32.0 then 100.0", "nums([32.0, 100.0])")],
  probes=[("celsius_to_fahrenheit(100) == 212 and (-40) == -40", "val('celsius_to_fahrenheit(100)') == 212 and val('celsius_to_fahrenheit(-40)') == -40"),
          ("fahrenheit_to_celsius(32) == 0 and (212) == 100", "val('fahrenheit_to_celsius(32)') == 0 and val('fahrenheit_to_celsius(212)') == 100")])

E("grind_11", "deterministic", "values-fixed-wording-free", "weak then strong (False/True or words); is_strong correct on edge cases",
  out=[("hello weak, secret42 strong", "[p for p in map(polarity, L) if p] == [-1, 1]")],
  probes=[("is_strong edge cases", "[val('is_strong(%r)' % p) for p in ['hello', 'secret42', 'abcdefgh', 'abc1', '12345678']] == [False, True, False, False, True]")])

E("ch7_r1", "free-choice", "values-from-variables", "4 labelled lines showing name, class, level, health from the kid's dict; rerun with another dict",
  out=[("4 lines, each shows one value with a label", "isinstance(ns.get('character'), dict) and len(L) == 4 and all(str(ns['character'][k]) in l and re.sub(re.escape(str(ns['character'][k])), '', l).strip() != '' for l, k in zip(L, ['name', 'class', 'level', 'health']))")],
  probes=[("character has the 4 keys, level and health numbers", "set(ns.get('character', {})) >= {'name', 'class', 'level', 'health'} and all(isinstance(ns['character'][k], (int, float)) for k in ('level', 'health'))"),
          ("rerun with another dict shows its values", "(lambda t: has('Zed', 'Bard', '99', '7', L=t))(rerun({'character': \"{'name': 'Zed', 'class': 'Bard', 'level': 99, 'health': 7}\"})[0])")])

E("ch7_r2", "deterministic", "exact", "printed dict equals {'name':'Hero','xp':100,'gold':75,'level':1,'title':'Adventurer'} (key order free); rerun gold/xp",
  out=[("a printed dict literal equals the expected dict", "any(l.startswith('{') and __import__('ast').literal_eval(l) == {'name': 'Hero', 'xp': 100, 'gold': 75, 'level': 1, 'title': 'Adventurer'} for l in L)")],
  probes=[("player dict final state", "ns.get('player') == {'name': 'Hero', 'xp': 100, 'gold': 75, 'level': 1, 'title': 'Adventurer'}"),
          ("rerun player gold=10 ends with gold 35 (increase, not set)", "rerun({'player': \"{'name': 'Hero', 'xp': 5, 'gold': 10}\"})[1].ns.get('player', {}).get('gold') == 35")],
  notes="Dict print order follows insertion order, so exact text depends on step order; compare parsed values instead.")

E("ch7_r3", "deterministic", "exact", "exact 'key: value' for 4 stats then total 55; rerun; uses .items()",
  out=[("4 exact lines then total 55", "L[:4] == ['strength: 15', 'speed: 12', 'magic: 8', 'luck: 20'] and nums([55], L=L[4:])")],
  probes=[("rerun stats={'a':1,'b':2} gives a: 1, b: 2, total 3", "(lambda t: t[:2] == ['a: 1', 'b: 2'] and nums([3], L=t[2:]))(rerun({'stats': \"{'a': 1, 'b': 2}\"})[0])")],
  ast=[("calls .items()", "calls('items') >= 1", "task")])

E("ch7_r4", "deterministic", "values-fixed-wording-free", "each location line shows its danger and treasure; last line names cave; rerun with another world",
  out=[("forest 3/5, cave 8/10, village 1/2 lines", "subseq([r're:.*forest.*\\b3\\b.*\\b5\\b.*', r're:.*cave.*\\b8\\b.*\\b10\\b.*', r're:.*village.*\\b1\\b.*\\b2\\b.*'])"),
       ("the highest-treasure line names cave", "'cave' in L[-1]")],
  probes=[("world dict is the given nested dict", "ns.get('world') == {'forest': {'danger': 3, 'treasure': 5}, 'cave': {'danger': 8, 'treasure': 10}, 'village': {'danger': 1, 'treasure': 2}}"),
          ("rerun world where 'mine' is richest names mine last", "'mine' in rerun({'world': \"{'mine': {'danger': 9, 'treasure': 50}, 'cave': {'danger': 8, 'treasure': 10}}\"})[0][-1]")],
  ast=[("loops with .items()", "calls('items') >= 1", "expectedBehavior")],
  notes="The starter is only comments, so the kid types the dict; if they name it differently than 'world', the probe and rerun miss it.")

E("ch7_r5", "deterministic", "values-fixed-wording-free", "3 member lines with attack/defense; last line names Mage; rerun with a different best",
  out=[("Knight 15/12, Mage 20/5, Rogue 12/8", "subseq([r're:.*Knight.*\\b15\\b.*\\b12\\b.*', r're:.*Mage.*\\b20\\b.*\\b5\\b.*', r're:.*Rogue.*\\b12\\b.*\\b8\\b.*'])"),
       ("last line names Mage", "'Mage' in L[-1]")],
  probes=[("rerun party with Rogue strongest names Rogue last", "'Rogue' in rerun({'party': \"[{'name': 'Knight', 'attack': 1, 'defense': 1}, {'name': 'Rogue', 'attack': 30, 'defense': 1}]\"})[0][-1]")])

E("ch7_s1", "deterministic", "exact", "exact Aria / unarmed / None; rerun hero with a weapon; 3 .get() calls",
  out=[("exact 3 lines", "lines(['Aria', 'unarmed', 'None'])")],
  probes=[("rerun hero={'name':'Zed','weapon':'bow'} gives Zed / bow / None", "rerun({'hero': \"{'name': 'Zed', 'weapon': 'bow'}\"})[0] == ['Zed', 'bow', 'None']")],
  ast=[("calls .get() at least 3 times", "calls('get') >= 3", "task")])

E("ch7_s2", "deterministic", "values-fixed-wording-free", "letter counts m1 i4 s4 p2 (any order, wording free); a counting dict exists; rerun word='banana'",
  out=[("each letter line shows its count", "len(L) == 4 and all(any(re.search(r'\\b%s\\b\\D*\\b%d\\b' % (ch, n), l) for l in L) for ch, n in [('m', 1), ('i', 4), ('s', 4), ('p', 2)])")],
  probes=[("a global dict equals the letter counts", "{'m': 1, 'i': 4, 's': 4, 'p': 2} in globals_of(dict)"),
          ("rerun word='banana' builds {'b':1,'a':3,'n':2}", "{'b': 1, 'a': 3, 'n': 2} in [v for k, v in rerun({'word': \"'banana'\"})[1].ns.items() if isinstance(v, dict) and not k.startswith('__')]")])

E("ch7_s3", "deterministic", "exact", "exact cubes and lengths dicts; 2 dict comprehensions",
  out=[("both dicts printed", "has('{1: 1, 2: 8, 3: 27, 4: 64, 5: 125}', \"{'cat': 3, 'elephant': 8, 'dog': 3}\")")],
  probes=[("cubes and lengths values", "ns.get('cubes') == {1: 1, 2: 8, 3: 27, 4: 64, 5: 125} and ns.get('lengths') == {'cat': 3, 'elephant': 8, 'dog': 3}")],
  ast=[("at least 2 dict comprehensions", "count(ast.DictComp) >= 2", "task")])

E("ch7_boss", "free-choice", "values-from-variables", "display_character prints every field of any character dict; the kid's dict has the required shape",
  out=[("something printed", "len(L) >= 4")],
  probes=[("a global dict has name, char_class, stats{strength,speed,magic}, inventory[list of str]",
           "any(isinstance(d.get('stats'), dict) and set(d['stats']) >= {'strength', 'speed', 'magic'} and isinstance(d.get('inventory'), list) and all(isinstance(x, str) for x in d['inventory']) and 'name' in d and 'char_class' in d for d in globals_of(dict))"),
          ("display_character takes 1 parameter and was called", "sig('display_character') == (1, 0) and 'display_character' in trace"),
          ("display_character(test dict) prints every leaf value", "(lambda t: all(s in '\\n'.join(t) for s in ['Zed', 'Bard', '71', '72', '73', 'rope', 'lamp']))(call(\"display_character({'name': 'Zed', 'char_class': 'Bard', 'stats': {'strength': 71, 'speed': 72, 'magic': 73}, 'inventory': ['rope', 'lamp']})\")[1])")],
  notes="'prints everything nicely' — completeness is checkable, niceness is not.")

E("grind_12", "deterministic", "values-fixed-wording-free", "word counts the:3 cat:2 sat:1 on:1 mat:1; rerun text='a b a'",
  out=[("5 lines, each word with its count", "len(L) == 5 and all(any(re.search(r'\\b%s\\b\\D*\\b%d\\b' % (w, n), l) for l in L) for w, n in [('the', 3), ('cat', 2), ('sat', 1), ('on', 1), ('mat', 1)])")],
  probes=[("a global dict equals the counts", "{'the': 3, 'cat': 2, 'sat': 1, 'on': 1, 'mat': 1} in globals_of(dict)"),
          ("rerun text='a b a' counts a:2 b:1", "{'a': 2, 'b': 1} in [v for k, v in rerun({'text': \"'a b a'\"})[1].ns.items() if isinstance(v, dict) and not k.startswith('__')]")])

E("grind_13", "free-choice", "values-from-variables", "every remaining contact printed with its phone; 3 created, 1 added, 1 deleted; uses .items()",
  out=[("one line per remaining contact", "len(globals_of(dict)) >= 1 and (lambda d: len(L) == len(d) and all(str(k) in out and str(v) in out for k, v in d.items()))(globals_of(dict)[0])")],
  probes=[("final dict has 3 entries (3 + 1 - 1)", "any(len(d) == 3 for d in globals_of(dict))")],
  ast=[("a dict literal with 3 entries", "any(isinstance(n, ast.Dict) and len(n.keys) == 3 for n in ast.walk(TREE))", "task"),
       ("adds with d[key] = value", "any(isinstance(n, ast.Assign) and isinstance(n.targets[0], ast.Subscript) for n in ast.walk(TREE))", "task"),
       ("deletes with del or .pop()", "count(ast.Delete) >= 1 or calls('pop') >= 1", "task"),
       ("prints with .items()", "calls('items') >= 1", "task")],
  notes="Intermediate states (3 then 4 then 3) are not visible after the run; AST covers the steps.")

E("ch8_r1", "random-unseeded", "property", "line 1 an int 1-6, line 2 one of sword/shield/potion, line 3 a permutation of [1..5]; randint/choice/shuffle actually used",
  out=[("die roll 1-6, a listed item, a shuffled list", "len(L) >= 3 and L[0].strip().isdigit() and 1 <= int(L[0]) <= 6 and L[1] in ('sword', 'shield', 'potion') and sorted(__import__('ast').literal_eval(L[2])) == [1, 2, 3, 4, 5]")],
  probes=[("with randint patched to 4 the roll is 4", "rerun(patches={'random.randint': lambda a, b: 4})[0][:1] == ['4']"),
          ("with choice patched to 'potion' line 2 is potion", "rerun(patches={'random.choice': lambda s: 'potion'})[0][1:2] == ['potion']"),
          ("with shuffle patched to reverse, line 3 is [5, 4, 3, 2, 1]", "rerun(patches={'random.shuffle': lambda x: x.reverse()})[0][2:3] == ['[5, 4, 3, 2, 1]']")],
  randomness="unseeded: grade by invariants; patch random functions to force known values",
  notes="Labels would break the line-1 int check; if kids label ('Dice: 4'), take the last number on the line instead.")

E("ch8_r2", "deterministic", "values-fixed-wording-free", "6, the joined string, and True appear in order; rerun with another sentence",
  out=[("word count, joined string, startswith result", "has('6', 'the - quick - brown - fox - jumps - over', 'True')")],
  probes=[("rerun sentence='  hello big world ' gives 3, hello - big - world, False", "has('3', 'hello - big - world', 'False', L=rerun({'sentence': \"'  hello big world '\"})[0])")],
  ast=[("calls strip, split, join, startswith", "all(calls(m) >= 1 for m in ('strip', 'split', 'join', 'startswith'))", "expectedBehavior")],
  notes="The rerun proves behaviour; method names are only named in expectedBehavior.")

E("ch8_r3", "deterministic", "free-text", "3 non-empty messages, no traceback; 3 try blocks catching ValueError, ZeroDivisionError, KeyError",
  out=[("3 non-empty lines", "len(L) == 3 and all(l.strip() for l in L)")],
  ast=[("3 try statements", "count(ast.Try) >= 3", "task"),
       ("handlers for ValueError, ZeroDivisionError and KeyError", "{'ValueError', 'ZeroDivisionError', 'KeyError'} <= {h.type.id for h in ast.walk(TREE) if isinstance(h, ast.ExceptHandler) and isinstance(h.type, ast.Name)}", "task")],
  notes="Messages are free text ('helpful' is not checkable). A bare except also runs cleanly; only the AST shows which error was named.")

E("ch8_r4", "deterministic", "values-fixed-wording-free", "4 name/score lines and Sam 92 as highest; records list of dicts with int scores; rerun with other data",
  out=[("Alex 85, Sam 92, Jo 78, Max 88 then Sam as highest", "subseq([r're:.*Alex.*\\b85\\b.*', r're:.*Sam.*\\b92\\b.*', r're:.*Jo.*\\b78\\b.*', r're:.*Max.*\\b88\\b.*', r're:.*Sam.*\\b92\\b.*'])")],
  probes=[("records parsed with int scores", "ns.get('records') == [{'name': 'Alex', 'score': 85}, {'name': 'Sam', 'score': 92}, {'name': 'Jo', 'score': 78}, {'name': 'Max', 'score': 88}]"),
          ("rerun data='Ann,1\\nBob,5' names Bob as highest", "'Bob' in rerun({'data': \"'Ann,1\\\\nBob,5'\"})[0][-1]")])

E("ch8_r5", "free-choice", "values-from-variables", "3 items displayed, one found; add_item/display/find_item behave correctly on fresh data",
  out=[("at least 4 lines (3 items + search result)", "len(L) >= 4")],
  probes=[("add_item appends one dict holding the name and qty", "(lambda inv: (val('add_item')(inv, 'Zed', 42), len(inv) == 1 and isinstance(inv[0], dict) and 'Zed' in inv[0].values() and 42 in inv[0].values())[1])([])"),
          ("find_item finds and misses", "(lambda inv: (val('add_item')(inv, 'Zed', 42), val('find_item')(inv, 'Zed') is inv[0] and val('find_item')(inv, 'nope') is None)[1])([])"),
          ("display prints one line per item", "(lambda inv: (val('add_item')(inv, 'Zed', 42), val('add_item')(inv, 'Yan', 7), (lambda t: len(t) == 2 and 'Zed' in t[0] and '42' in t[0] and 'Yan' in t[1])(callf('display', inv)[1]))[2])([])"),
          ("main run calls add_item 3 times, display and find_item", "trace.count('add_item') >= 3 and 'display' in trace and 'find_item' in trace")],
  notes="Dict key names for items are not fixed by the task, so probes check values, not keys.")

E("ch8_s1", "deterministic", "exact", "table header, dashes, Sword $29.99, Shield $15.50, Potion $3.00 (spacing lenient); format specifiers used",
  out=[("header, divider and 3 priced rows", "lines([r're:Item\\s+Price', r're:-{5,}', r're:Sword\\s+\\$29\\.99', r're:Shield\\s+\\$15\\.50', r're:Potion\\s+\\$3\\.00'])"),
       ("prices right-aligned in one column (optional strictness)", "len({len(l) for l in L[2:]}) == 1")],
  ast=[("uses an f-string format spec (e.g. :<10, :.2f)", "any(isinstance(n, ast.FormattedValue) and n.format_spec is not None for n in ast.walk(TREE))", "expectedBehavior")],
  notes="$15.50 / $3.00 prove a 2-decimal format in the output itself; the column-alignment check is optional strictness.")

E("ch8_s2", "deterministic", "values-fixed-wording-free", "a double() test result, alphabetical list, length-sorted list; double is a lambda; sorted(key=lambda)",
  out=[("alphabetical then by-length lists", "has(\"['apple', 'banana', 'cherry']\", \"['apple', 'cherry', 'banana']\")")],
  probes=[("double is a lambda that doubles", "getattr(ns.get('double'), '__name__', '') == '<lambda>' and val('double(7)') == 14"),
          ("double was tested (its result is printed before the lists)", "any(re.search(r'-?\\d', l) for l in L[:max(1, len(L) - 2)])")],
  ast=[("sorted() called with key=lambda", "any(isinstance(n, ast.Call) and getattr(n.func, 'id', '') == 'sorted' and any(k.arg == 'key' and isinstance(k.value, ast.Lambda) for k in n.keywords) for n in ast.walk(TREE))", "task")],
  notes="key=len and key=lambda w: len(w) sort identically; only AST distinguishes. Stable sort keeps cherry before banana (both length 6).")

E("ch8_s3", "deterministic", "values-fixed-wording-free", "names appear in orders Mage Knight Rogue / Mage Knight Rogue / Knight Mage Rogue; rerun with data where the 3 orders differ",
  out=[("three sorted orders", "[w for w in re.findall(r'\\b(Knight|Mage|Rogue)\\b', out)] == ['Mage', 'Knight', 'Rogue', 'Mage', 'Knight', 'Rogue', 'Knight', 'Mage', 'Rogue']")],
  probes=[("rerun with Zed/Yan/Xia (orders all differ)", "re.findall(r'\\b(Zed|Yan|Xia)\\b', '\\n'.join(rerun({'heroes': \"[{'name': 'Zed', 'power': 1, 'speed': 1}, {'name': 'Yan', 'power': 2, 'speed': 3}, {'name': 'Xia', 'power': 3, 'speed': 2}]\"})[0])) == ['Xia', 'Yan', 'Zed', 'Zed', 'Xia', 'Yan', 'Xia', 'Yan', 'Zed']")],
  ast=[("sorted() with key=lambda", "any(isinstance(n, ast.Call) and getattr(n.func, 'id', '') == 'sorted' and any(k.arg == 'key' and isinstance(k.value, ast.Lambda) for k in n.keywords) for n in ast.walk(TREE))", "expectedBehavior"),
       ("reverse=True used for the descending sort", "any(isinstance(n, ast.keyword) and n.arg == 'reverse' for n in ast.walk(TREE))", "expectedBehavior")],
  notes="With the given data, power-descending and speed-ascending give the SAME order, so a kid who sorts by power twice passes the plain output check; the rerun data breaks that tie.")

E("ch8_boss", "random-unseeded", "property", "with random.randint patched, per-guess results and stopping are right; check_guess correct",
  out=[("4 guess results printed, secret and stats shown", "len([l for l in L if re.search(r'(?i)high|low|correct', l)]) >= 1")],
  probes=[("check_guess(5, 3)='high', (1, 3)='low', (3, 3)='correct'", "[val('check_guess(%d, 3)' % g) for g in (5, 1, 3)] == ['high', 'low', 'correct']"),
          ("secret=13: low, high, low, correct", "[re.search(r'(?i)high|low|correct', l).group().lower() for l in rerun(patches={'random.randint': lambda a, b: 13})[0] if re.search(r'(?i)\\b(high|low|correct)\\b', l)][:4] == ['low', 'high', 'low', 'correct']"),
          ("secret=7: stops after the 3rd guess", "[re.search(r'(?i)high|low|correct', l).group().lower() for l in rerun(patches={'random.randint': lambda a, b: 7})[0] if re.search(r'(?i)\\b(high|low|correct)\\b', l)][:4] == ['high', 'high', 'correct']"),
          ("attempts tracked in a dict", "any(4 in d.values() for d in globals_of(dict))")],
  randomness="unseeded (starter never calls random.seed): patch random.randint to a known secret",
  notes="The secret is never seeded, so exact output is impossible; patching randint makes every branch testable.")

E("grind_14", "deterministic", "values-fixed-wording-free", "3.3333333333333335 then an error message; safe_divide never raises; try/except ZeroDivisionError",
  out=[("10/3 result then a non-number line", "len(L) == 2 and nums([10/3], L=L[:1]) and not re.fullmatch(r'-?\\d+(\\.\\d+)?', L[1])")],
  probes=[("safe_divide(10, 4) == 2.5", "val('safe_divide(10, 4)') == 2.5"),
          ("safe_divide(1, 0) returns instead of raising", "not (isinstance(val('safe_divide(1, 0)'), tuple) and val('safe_divide(1, 0)')[:1] == ('__error__',))")],
  ast=[("uses try/except", "count(ast.Try) >= 1", "task"),
       ("catches ZeroDivisionError (or bare except)", "any(isinstance(h, ast.ExceptHandler) and (h.type is None or getattr(h.type, 'id', '') in ('ZeroDivisionError', 'Exception', 'ArithmeticError')) for h in ast.walk(TREE))", "expectedBehavior")],
  notes="'if b != 0' avoids the error with identical output; the task explicitly asks for try/except.")

E("grind_15", "random-unseeded", "property", "10 roll lines with two dice 1-6, doubles count equals the number of equal pairs; patched randint proves counting",
  out=[("10 rolls with dice 1-6", "len([l for l in L if len(ints(l)) >= 2]) >= 10 and all(1 <= d <= 6 for l in L[:10] for d in ints(l)[-2:])"),
       ("doubles count matches the rolls", "ints(L[-1])[-1:] == [sum(1 for l in L[:10] if ints(l)[-2] == ints(l)[-1])]")],
  probes=[("randint patched to 3: doubles is 10", "ints(rerun(patches={'random.randint': lambda a, b: 3})[0][-1])[-1:] == [10]"),
          ("randint alternating 1,2: doubles is 0", "ints(rerun(patches={'random.randint': seq([1, 2])})[0][-1])[-1:] == [0]")],
  randomness="unseeded: invariants + patched randint")
