// Grading rules for chapters 5-8 and practice grind_8-15 (ported from rules_b.py). Format: see src/checks.js.
// py`...` is String.raw: each expr is the Python text exactly as written, backslashes and quotes included.
// The Python helpers below are spliced into exprs with ${...}; no expr uses ${ for anything else.
const py = String.raw;

// A list printed once, and its length printed as a number somewhere outside it: before it, after it or on
// its line (ch5_r5, grind_8). Only one line may hold a list, so printing inside the loop fails
// (fixtures wrong/adv_prints_in_loop).
const LIST_AND_LEN = py`(lambda t, lst, n: sum('[' in l for l in t) == 1 and has(lst, L=t) and nums([n], L=['\n'.join(t).replace(lst, ' ', 1)]))`;

// The item lines as a block, then the total on the last line (ch5_boss, ch7_r3). Lines before the block,
// such as a title, are fine (fixtures adv_header). Between the block and the last line nothing may hold
// a number, so a total printed inside its loop fails (fixtures wrong/adv_total_in_loop and wrong/adv_total_in_second_loop).
const BLOCK_THEN_TOTAL = py`(lambda t, block, total: (lambda T: any(T[k:k + len(block)] == block and len(T) > k + len(block) and nums([total], L=T[-1:]) and not any(re.search(r'\d', l) for l in T[k + len(block):-1]) for k in range(len(T))))([l for l in t if l.strip()]))`;

// True when a loop (a for or a comprehension) goes over a call to name, like enumerate(heroes) or
// stats.items(). A bare enumerate(heroes) statement before a range() loop doesn't count (ch5_s2, ch7_r3).
const LOOPS_OVER = py`(lambda name: any(isinstance(n, (ast.For, ast.comprehension)) and any(isinstance(c, ast.Call) and getattr(c.func, 'id', getattr(c.func, 'attr', None)) == name for c in ast.walk(n.iter)) for n in ast.walk(TREE)))`;

// False when a call to the kid's function f sits on a line by itself, throwing its answer away, as in
// is_strong("hello") followed by a typed print("hello is weak"). A function that prints for itself, as
// f(*a) shows, can be called that way.
const USES_ANSWER = py`(lambda f, *a: not any(isinstance(n, ast.Expr) and isinstance(n.value, ast.Call) and getattr(n.value.func, 'id', '') == f for n in ast.walk(TREE)) or bool(callf(f, *a)[1]))`;

// ch5_r1: the three items in order and then the length, either one item per line or all three on one line
// (fixture adv_one_line_items).
const CH5_R1 = py`(lambda t, v, n: (len(t) == 4 and all(str(x) in l for x, l in zip(v, t)) or len(t) == 2 and has(*map(str, v), L=t[:1])) and nums([n], L=t[-1:]))`;

// ch5_r4: the items printed, in the order they appear, must be the first 3, the last 2 and then the middle
// ([2:4] or [2:5]: "index 2 to 4" reads both ways, fixture ALT_inclusive_middle). Reading item names, not
// list reprs, lets a loop print each slice's items one per line (fixture adv_loop_each_item).
const CH5_R4 = py`(lambda t, v: (lambda W: any(' %s ' % ' '.join(v[:3] + v[-2:] + v[2:k]) in W for k in (4, 5)))(' %s ' % ' '.join(w for w in re.findall(r'\w+', '\n'.join(t)) if w in v)) and nums([len(v)], L=t))`;

// ch7_r1: 4 lines, each holding one of the values and a label. The task doesn't set an order
// (fixture adv_other_order), so any line may hold any value.
const CH7_R1 = py`(lambda t, c: len(t) == 4 and any(all(str(c[k]) in l and re.sub(re.escape(str(c[k])), '', l).strip() != '' for l, k in zip(t, p)) for p in __import__('itertools').permutations(['name', 'class', 'level', 'health'])))`;

// ch7_s2, grind_12: one line per counted thing, each naming it and then its count.
const COUNT_LINES = py`(lambda t, pairs: len(t) == len(pairs) and all(any(re.search(r'\b%s\b\D*\b%d\b' % (w, n), l) for l in t) for w, n in pairs))`;

// ch8_boss: the results in the printed lines, in order. "You got it!" counts as correct, so a game that
// turns check_guess's answers into its own messages works (fixture adv_friendly_messages).
const RESULTS = py`(lambda t: [m.group(1).lower() if m.group(1).lower() in ('high', 'low') else 'correct' for m in (re.search(r'(?i)\b(high|low|correct|got it|you win|you won)\b', l) for l in t) if m])`;

// ch5_s1: the yes/no answers, 1 or -1, in order.
// - When exactly 4 lines name a searched book, each answer is its named line plus the lines after it, up
//   to the next named line (so print(book) then print(book in library) works: fixture ALT_name_then_bool).
//   The last answer gets as many lines as the first, so a heading or a closing line is left out. An answer
//   is no if it says so, and yes otherwise: the engine's polarity() gives 0 for "Python exists" or "we have
//   it", and its n't can't match inside "don't" (fixtures ALT_exists, ALT_have_it).
// - Otherwise, as for print("Python" in library), the answers are the lines polarity() reads as yes or no
//   (fixture ALT_bools).
const CH5_S1_ANSWERS = py`(lambda t: (lambda idx: [-1 if re.search(r"(?i)\b(no|not|nope|false|missing|unavailable|isnt|doesnt|dont|wasnt)\b|n['’]t\b|❌", ' '.join(t[i:j])) else 1 for i, j in zip(idx, idx[1:] + [idx[-1] + idx[1] - idx[0]])] if len(idx) == 4 else [p for p in map(polarity, t) if p])([i for i, l in enumerate(t) if re.search(r'\b(Python|Ruby|Games|Math)\b', l)]))`;

// grind_15: the numbers on a line, leaving out labels such as "Die 1" or "2nd die", and a sum such as
// "= 8" or "total 8" (fixture adv_with_sum). Dice are never negative, so "3-5" is two dice.
const DICE = py`(lambda l: [int(x) for x in re.findall(r'\d+', re.sub(r'(?i)\b(?:die|dice)\s*#?\d+|\b\d+(?:st|nd|rd|th)\b|=\s*\d+|\b(?:total|sum)\b\W*\d+', '', l))])`;

export const BATCH_B = {
  // ---------- Chapter 5: lists ----------
  // Changed from the prototype: each line only has to contain its value, so labels such as "First: pizza"
  // pass (fixture ALT_labels), and the three items can share a line (CH5_R1). The re-run list has 5 items
  // with distinct names, so a typed print(4) for the length fails (wrong/typed_length) and a label can't
  // match an item by accident.
  ch5_r1: {
    output: [{ expr: py`isinstance(ns.get('favorites'), list) and (lambda f: ${CH5_R1}(L, [f[0], f[-1], f[1]], len(f)))(ns['favorites'])` }],
    probes: [
      { expr: py`isinstance(ns.get('favorites'), list) and len(ns['favorites']) == 4`, hint: "Your favorites list should have exactly 4 things in it." },
      { expr: py`${CH5_R1}(rerun({'favorites': "['Zappa', 'Yoyo', 'Wren', 'Vole', 'Quux']"})[0], ['Zappa', 'Quux', 'Yoyo'], 5)`, hint: "Print the items by their index, like favorites[0], and the count with len(), so it would work for any list." },
    ],
  },
  ch5_r2: {
    output: [{ expr: py`has("['Alpha', 'Arch', 'Beta', 'Code']") or has('Alpha', 'Arch', 'Beta', 'Code')` }],
    probes: [
      { expr: py`ns.get('books') == ['Alpha', 'Arch', 'Beta', 'Code']`, hint: "Change the books list itself with list methods like .append() and .sort(), then print books." },
      { expr: py`rerun({'books': "['Zed', 'Dragon']"})[1].ns.get('books') == ['Alpha', 'Beta', 'Zed']`, hint: "Do each step with a list method on books, so the steps would still work if the shelf started with different books." },
    ],
  },
  ch5_r3: {
    output: [{ expr: py`len(L) == 6 and all(str(s) in l and (('pass' in l.lower()) == (s >= 70)) and (('fail' in l.lower()) == (s < 70)) for l, s in zip(L, [85, 42, 91, 67, 73, 55]))` }],
    probes: [
      { expr: py`[('pass' in l.lower(), '70' in l or '69' in l) for l in rerun({'scores': '[70, 69]'})[0]] == [(True, True), (False, True)]`, hint: "Loop through the scores list and decide with an if, so a score of exactly 70 counts as a Pass." },
    ],
  },
  // Changed from the prototype, which wanted each slice printed as a list: CH5_R4 reads the item names in
  // order instead. The re-run items are animals, so no label word can pass for one.
  ch5_r4: {
    output: [{ expr: py`${CH5_R4}(L, ['map', 'torch', 'key', 'gem', 'scroll', 'ring'])` }],
    probes: [
      { expr: py`${CH5_R4}(rerun({'items': "['ant', 'bee', 'cat', 'dog', 'elk', 'fox', 'gnu']"})[0], ['ant', 'bee', 'cat', 'dog', 'elk', 'fox', 'gnu'])`, hint: "Use slices that work for any list, like items[:3] and items[-2:], and len(items) for the count." },
    ],
  },
  // Changed from the prototype, which only looked for the list and a 4 anywhere: see LIST_AND_LEN. The
  // re-run also checks the printed length, so a typed print(4) fails (wrong/adv_typed_list_len).
  ch5_r5: {
    output: [{ expr: py`${LIST_AND_LEN}(L, "['quick', 'jumps', 'over', 'lazy']", 4)` }],
    probes: [
      { expr: py`ns.get('long_words') == ['quick', 'jumps', 'over', 'lazy']`, hint: "Build long_words from the words list, adding each word that has more than 3 letters." },
      { expr: py`(lambda t, r: r.ns.get('long_words') == ['hello', 'world'] and ${LIST_AND_LEN}(t, "['hello', 'world']", 2))(*rerun({'words': "['hello', 'hi', 'world']"}))`, hint: "Check each word's length with len() inside your loop, and print len(long_words), so it would work for any list of words." },
    ],
  },
  // The task text doesn't name `in`, but the NPC's last line tells the kid to use in and not in, and the
  // room is about them. A loop that compares each book with == passed without the concept check
  // (wrong/adv_manual_search_loop). The for loop's own `in` isn't a comparison, so it doesn't count.
  ch5_s1: {
    output: [{ expr: py`${CH5_S1_ANSWERS}(L) == [1, -1, 1, -1]` }],
    concepts: [{ expr: py`any(isinstance(n, ast.Compare) and any(isinstance(op, (ast.In, ast.NotIn)) for op in n.ops) for n in ast.walk(TREE))`, hint: "This room is about the in keyword. Check each name with it, like if \"Python\" in library:, instead of searching the list yourself." }],
    probes: [
      { expr: py`${CH5_S1_ANSWERS}(rerun({'library': "['Ruby', 'Math']"})[0]) == [-1, 1, -1, 1]`, hint: "Check each name with the in keyword, so your answers would change if the library changed." },
    ],
  },
  ch5_s2: {
    output: [{ expr: py`lines(['0: Link', '1: Mario', '2: Samus', '3: Kirby'])` }],
    // Changed from calls('enumerate') >= 1, which a bare enumerate(heroes) line passed (wrong/adv_enumerate_statement).
    concepts: [{ expr: py`${LOOPS_OVER}('enumerate')`, hint: "This room is about enumerate(). Loop over it, like for i, hero in enumerate(heroes):, to get each hero's number and name together." }],
    probes: [
      { expr: py`rerun({'heroes': "['A', 'B']"})[0] == ['0: A', '1: B']`, hint: "Print the number and name that enumerate() gives you, instead of typing them." },
    ],
  },
  ch5_s3: {
    output: [{ expr: py`has('[2, 4, 6, 8, 10]', "['hello', 'howdy']")` }],
    concepts: [
      { expr: py`count(ast.ListComp) >= 2`, hint: "Build both lists with list comprehensions: the one-line [... for ... in ...] shorthand." },
      // [x for x in [2, 4, 6, 8, 10]] is a comprehension around the typed answer (wrong/adv_typed_in_comprehension).
      { expr: py`any(isinstance(n, ast.ListComp) and (any(isinstance(m, ast.BinOp) for m in ast.walk(n.elt)) or any(isinstance(g.iter, ast.Call) and getattr(g.iter.func, 'id', '') == 'range' for g in n.generators)) for n in ast.walk(TREE))`, hint: "Work out the doubles inside your comprehension, with range() and some math, instead of typing the numbers." },
    ],
    probes: [
      { expr: py`ns.get('doubles') == [2, 4, 6, 8, 10] and ns.get('long') == ['hello', 'howdy']`, hint: "Store your two lists in variables named doubles and long, like the task shows." },
      // len(w) > 4 also gives ['hello', 'howdy'] (wrong/adv_greater_than_4). A re-run can't change the words,
      // because the content's hint puts the list inside the comprehension, so this tries the kid's own
      // filter on words of 3, 4 and 5 letters. len(w) >= 4 is fine (fixture ALT_other_names).
      { expr: py`any(len(n.generators) == 1 and isinstance(n.generators[0].target, ast.Name) and n.generators[0].ifs and [val('(lambda %s: bool(%s))(%r)' % (n.generators[0].target.id, ' and '.join('(%s)' % ast.unparse(c) for c in n.generators[0].ifs), w)) for w in ('abc', 'abcd', 'abcde')] == [False, True, True] for n in ast.walk(TREE) if isinstance(n, ast.ListComp))`, hint: "Pick the long words with an if in your comprehension that lets in every word with more than 3 letters, so 4-letter words count too." },
    ],
  },
  // Changed from the prototype, which wanted the item lines first and a 29 anywhere after them: see
  // BLOCK_THEN_TOTAL.
  ch5_boss: {
    output: [{ expr: py`${BLOCK_THEN_TOTAL}(L, ['Sword x1', 'Potion x5', 'Arrow x20', 'Gem x3'], 29)` }],
    probes: [
      { expr: py`ns.get('inventory') == ['Sword', 'Potion', 'Arrow', 'Gem'] and ns.get('counts') == [1, 5, 20, 3]`, hint: "Change the inventory and counts lists themselves: add Gem to both, and take Shield out of both." },
      { expr: py`${BLOCK_THEN_TOTAL}(rerun({'inventory': "['Shield', 'Bow']", 'counts': '[2, 7]'})[0], ['Bow x7', 'Gem x3'], 10)`, hint: "Find where Shield is with inventory.index() instead of typing its position, and add up the counts with your code." },
    ],
  },
  // Changed from the prototype, which wanted the length on the last line: see LIST_AND_LEN (the length can
  // come first, fixture adv_length_first). The re-run list has a 10, so n >= 10 fails (wrong/adv_at_least_10).
  grind_8: {
    output: [{ expr: py`${LIST_AND_LEN}(L, '[12, 23, 17, 21]', 4)` }],
    probes: [
      { expr: py`${LIST_AND_LEN}(rerun({'numbers': '[11, 3, 10, 50]'})[0], '[11, 50]', 2)`, hint: "Build your new list from numbers with a loop, keeping only numbers bigger than 10, and print its len(), so it would work for any numbers." },
    ],
  },
  grind_9: {
    output: [{ expr: py`has('[5, 4, 3, 2, 1]')` }],
    concepts: [
      // Only a .reverse() method call counts: the kid's own def reverse(lst) is fine (fixture adv_func_named_reverse).
      { expr: py`not any(isinstance(n, ast.Call) and isinstance(n.func, ast.Attribute) and n.func.attr == 'reverse' for n in ast.walk(TREE))`, hint: "The task says not to use .reverse(). Build the reversed list yourself." },
      { expr: py`count(ast.For, ast.While) >= 1`, hint: "Use a for or while loop to build your new reversed list." },
    ],
    probes: [
      { expr: py`has('[9, 8, 7]', L=rerun({'original': '[7, 8, 9]'})[0])`, hint: "Build the reversed list from original with your loop, so it would work for any list." },
    ],
  },

  // ---------- Chapter 6: functions ----------
  // The war cry can take more than one line (fixture adv_two_line_cry): the output is the same cry 3 times.
  ch6_r1: {
    output: [{ expr: py`len(L) >= 3 and len(L) % 3 == 0 and any(l.strip() for l in L) and L == L[:len(L) // 3] * 3` }],
    probes: [
      { expr: py`sig('battle_cry') == (0, 0)`, hint: "Define a function called battle_cry with def and empty parentheses: it doesn't need any inputs." },
      { expr: py`call('battle_cry()')[1] * 3 == L`, hint: "Each call to battle_cry() should print your war cry once. Call it 3 times instead of looping inside it." },
      { expr: py`trace.count('battle_cry') == 3`, hint: "Call battle_cry() exactly 3 times." },
    ],
  },
  // A line that differs from "[name] — Level [level]" only in capitals or punctuation, like "Knight - level 5",
  // is a near miss (the design's rule): it still fails, but with a hint that says so (wrong/lowercase_level).
  ch6_r2: {
    output: [
      { expr: py`len(L) == 3 and len(set(L)) == 3 and all(re.fullmatch(r'(?i).+?\W*level\W*\S+', l) for l in L)` },
      { expr: py`all(re.fullmatch(r'.+?\s*[—–-]+\s*Level\s+\S+', l) for l in L)`, hint: "So close! Check your capital letters and punctuation: each line should look like [name] — Level [level] from the task (a - is fine for the —)." },
      // hero_status(5, "Knight") prints "5 — Level Knight" (wrong/adv_args_swapped); so does a swapped
      // f-string (wrong/adv_fstring_swapped), so the hint names both.
      { expr: py`all((lambda m: m is not None and not re.fullmatch(r'-?\d+(\.\d+)?', m.group(1).strip()))(re.fullmatch(r'(.+?)\s*[—–-]+\s*Level\s+\S+', l)) for l in L)`, hint: "Each line should start with the hero's name and end with the level, like Knight — Level 5. Check the order in your calls and in your print." },
    ],
    probes: [
      { expr: py`sig('hero_status') == (2, 0)`, hint: "hero_status needs two parameters in its parentheses: one for the name and one for the level." },
      // The name has to come before "Level" and the level after it (wrong/adv_fstring_swapped).
      { expr: py`(lambda t: len(t) == 1 and re.fullmatch(r'.*Zed\s*[—–-]+\s*Level\s+99\S*', t[0]) is not None)(call("hero_status('Zed', 99)")[1])`, hint: "hero_status should print the name it is given, then — Level, then the level it is given, using its parameters." },
      { expr: py`trace.count('hero_status') == 3`, hint: "Call hero_status 3 times, once for each hero." },
    ],
  },
  ch6_r3: {
    output: [{ expr: py`len(L) == 1 and re.fullmatch(r'Damage dealt: (\S+)', L[0]) is not None` }],
    probes: [
      { expr: py`call('calculate_damage(4, 5)') == (20, []) and val('calculate_damage(3, 0.5)') == 1.5`, hint: "calculate_damage should give back base * multiplier with return, not print it." },
      // Changed from comparing the printed value with every global, which a stored damage next to a typed
      // print("Damage dealt: 30") passed (wrong/adv_typed_result). The re-run replaces the first top-level
      // variable set from calculate_damage with calculate_damage(4, 5), and the program must then print 20.
      { expr: py`(lambda A: (lambda K: bool(K) and (lambda t: len(t) == 1 and nums([20], L=t))(rerun({K[0]: 'calculate_damage(4, 5)'})[0]))(['%s#%d' % (x, sum(y == x for y, _ in A[:i + 1])) for i, (x, n) in enumerate(A) if any(isinstance(c, ast.Call) and getattr(c.func, 'id', '') == 'calculate_damage' for c in ast.walk(n.value))]))([(n.targets[0].id, n) for n in TREE.body if isinstance(n, ast.Assign) and len(n.targets) == 1 and isinstance(n.targets[0], ast.Name)])`, hint: "Store the answer from calculate_damage in a variable first, then print that variable instead of a number you typed." },
    ],
  },
  ch6_r4: {
    output: [
      // The task never says to print, so a kid who only calls power_up sees nothing: say what to do.
      { expr: py`any(l.strip() for l in L)`, hint: "Nothing showed up yet! power_up gives its message back, so print what it gives back, like print(power_up(\"Knight\"))." },
      { expr: py`any(re.fullmatch(r'.+ gained 10 power!', l) for l in L) and any(re.fullmatch(r'.+ gained (?!10 )-?\d+(\.\d+)? power!', l) for l in L)` },
    ],
    probes: [
      { expr: py`sig('power_up') == (2, 1)`, hint: "Give power_up two parameters, name and amount, and make amount 10 unless it's given." },
      { expr: py`call("power_up('Zed')")[0] == 'Zed gained 10 power!'`, hint: "power_up should return the message instead of printing it. Print what it gives back." },
      { expr: py`val("power_up('Zed', 7)") == 'Zed gained 7 power!'`, hint: "Put the amount parameter in the message, so a custom amount shows up in it." },
      // The output check alone passes a second message typed into print() (fixture wrong/typed_second).
      { expr: py`{len(n.args) + len(n.keywords) for n in ast.walk(TREE) if isinstance(n, ast.Call) and getattr(n.func, 'id', '') == 'power_up'} >= {1, 2}`, hint: "Call power_up twice and print what it gives back: once with just a name, and once with a name and your own amount." },
      // Calls on lines of their own, then both messages typed into print() (wrong/adv_typed_both).
      { expr: py`${USES_ANSWER}('power_up', 'Zed')`, hint: "Print what power_up gives back, like print(power_up(\"Knight\")): a call on a line by itself throws its message away." },
    ],
  },
  ch6_r5: {
    output: [{ expr: py`nums([87.6, 95])` }],
    probes: [
      // A list of the two values unpacks just like a tuple (fixture ALT_list_return).
      { expr: py`(lambda v: isinstance(v, (tuple, list)) and list(v) == [2.0, 3])(val('analyze_scores([1, 2, 3])'))`, hint: "analyze_scores should return two things for any list: the average (sum divided by len) and the highest score." },
      { expr: py`87.6 in [v for k, v in ns.items() if not k.startswith('__') and isinstance(v, float)] and any(v == 95 and type(v) is int for k, v in ns.items() if not k.startswith('__'))`, hint: "Unpack what analyze_scores returns into two separate variables, then print both." },
      { expr: py`nums([15.0, 20], L=rerun({'scores': '[10, 20]'})[0])`, hint: "Work out both answers from the scores list with your function, so they change when the scores do." },
    ],
  },
  // The three ratings can share a line (fixture adv_one_line).
  ch6_s1: {
    output: [{ expr: py`nums_per_line([10, 30, 55]) or len(L) == 1 and nums([10, 30, 55])` }],
    probes: [
      { expr: py`val('calc_attack(2)') == 6 and val('calc_defense(2)') == 9 and val('power_rating(2)') == 15`, hint: "Make each function return the answer to its formula from the task, using its level parameter." },
      { expr: py`called_from('calc_attack', 'power_rating') and called_from('calc_defense', 'power_rating')`, hint: "power_rating should call calc_attack and calc_defense and add up what they return." },
      // One real call next to typed-in ratings passed without this (wrong/adv_one_call_rest_typed).
      { expr: py`trace.count('power_rating') >= 3 and ${USES_ANSWER}('power_rating', 1)`, hint: "Print what power_rating gives back for each level, 1, 5 and 10, instead of typing the numbers." },
    ],
  },
  ch6_s2: {
    output: [
      // Changed from 'calculate_area(width, height)': the room is about docstrings, so other parameter
      // names are fine (fixture adv_short_param_names).
      { expr: py`has('Help on function calculate_area', 'calculate_area(')` },
      { expr: py`isinstance(ns.get('calculate_area'), type(lambda: 0)) and bool(ns['calculate_area'].__doc__) and ns['calculate_area'].__doc__.strip().splitlines()[0].strip() in out` },
    ],
    probes: [
      { expr: py`val('calculate_area(3, 4)') == 12`, hint: "calculate_area should return width * height." },
      { expr: py`bool((ns['calculate_area'].__doc__ or '').strip())`, hint: "Put a docstring, a string in triple quotes, on the first line inside calculate_area." },
    ],
  },
  // Changed from exactly 2 lines: printing the global score before the call too is a fine way to show
  // they're independent (fixture adv_before_and_after). The 50 comes before the last line, which holds 100.
  // The prototype read no variables, so typed lines passed (wrong/adv_typed_values, adv_never_called).
  ch6_s3: {
    output: [{ expr: py`len(L) >= 2 and nums([100], L=L[-1:]) and any(nums([50], L=[l]) for l in L[:-1])` }],
    concepts: [
      { expr: py`any_func_assigns('score')`, hint: "Inside your function, make its own score = 50 before printing it." },
      { expr: py`count(ast.Global) == 0`, hint: "Don't use the global keyword here: the function's score should stay separate from the one outside." },
      { expr: py`any(isinstance(c, ast.Call) and getattr(c.func, 'id', '') == 'print' and any(isinstance(m, ast.Name) and m.id == 'score' for m in ast.walk(c)) for f in fdef() if assigns_in_func(f.name, 'score') for c in ast.walk(f))`, hint: "Inside your function, print the score variable itself, like print(score), instead of typing 50." },
    ],
    probes: [
      { expr: py`ns.get('score') == 100`, hint: "Keep a variable called score, equal to 100, outside the function." },
      { expr: py`any(f.name in trace and (lambda t: bool(t) and nums([50], L=t) and all(l in L[:-1] for l in t))(callf(f.name)[1]) for f in fdef() if assigns_in_func(f.name, 'score'))`, hint: "Call your function before you print the global score, so its local 50 shows up first." },
      { expr: py`nums([7], L=rerun({'score': '7'})[0][-1:])`, hint: "At the end, print the global score variable itself, like print(score), instead of typing 100." },
    ],
  },
  // The task text calls a parameter str, which shadows the built-in; the content could rename it.
  // Changed from len(L) >= 3: a report on one line is a correct answer (fixture ALT_one_line_report).
  // The probes check what hero_report prints.
  ch6_boss: {
    output: [{ expr: py`len(L) >= 1` }],
    probes: [
      { expr: py`val('calc_attack(3, 4)') == 10 and val('calc_defense(4, 2)') == 7.0`, hint: "calc_attack and calc_defense should each return the value from the task's formula." },
      { expr: py`sig('hero_report') == (5, 0)`, hint: "hero_report needs 5 parameters: the name and the four numbers." },
      { expr: py`(lambda t: 'Zed' in '\n'.join(t) and numset([10, 7.0, 17.0], L=t))(call("hero_report('Zed', 3, 4, 4, 2)")[1])`, hint: "hero_report should print the name, attack, defense and total power for the values it is given." },
      { expr: py`called_from('calc_attack', 'hero_report') and called_from('calc_defense', 'hero_report')`, hint: "Inside hero_report, call calc_attack and calc_defense instead of doing their math again." },
    ],
  },
  // The two tests can come in either order (fixture ALT_reverse_order); the probes check the functions.
  grind_10: {
    output: [{ expr: py`numset([32.0, 100.0])` }],
    probes: [
      // The hints name the formula: they also show for a function that returns a wrong answer.
      { expr: py`val('celsius_to_fahrenheit(100)') == 212 and val('celsius_to_fahrenheit(-40)') == -40`, hint: "celsius_to_fahrenheit(c) should return c * 9/5 + 32 (use return, not print), so it works for any temperature." },
      { expr: py`val('fahrenheit_to_celsius(32)') == 0 and val('fahrenheit_to_celsius(212)') == 100`, hint: "fahrenheit_to_celsius(f) should return (f - 32) * 5/9 (use return, not print), so it works for any temperature." },
      // Correct functions next to typed-in answers passed without this (wrong/adv_typed_output).
      { expr: py`'celsius_to_fahrenheit' in trace and 'fahrenheit_to_celsius' in trace and ${USES_ANSWER}('celsius_to_fahrenheit', 0) and ${USES_ANSWER}('fahrenheit_to_celsius', 212)`, hint: "Test both functions: print what celsius_to_fahrenheit(0) and fahrenheit_to_celsius(212) give back." },
    ],
  },
  // A line holding two answers, as print(is_strong("hello"), is_strong("secret42")) prints, counts as two
  // (fixture adv_one_line).
  grind_11: {
    output: [{ expr: py`[a for l in L for a in ([1 if w == 'True' else -1 for w in re.findall(r'\b(True|False)\b', l)] if len(re.findall(r'\b(True|False)\b', l)) > 1 else [polarity(l)]) if a] == [-1, 1]` }],
    probes: [
      { expr: py`[val('is_strong(%r)' % p) for p in ['hello', 'secret42', 'abcdefgh', 'abc1', '12345678']] == [False, True, False, False, True]`, hint: "is_strong should return True only when both rules are met: at least 8 characters AND at least one digit." },
      // A correct is_strong next to typed-in answers passed without this (fixture wrong/typed_prints), and
      // calls on lines of their own before the typed answers passed the trace alone (wrong/adv_calls_then_typed).
      { expr: py`trace.count('is_strong') >= 2 and ${USES_ANSWER}('is_strong', 'hello')`, hint: "Test your function: call is_strong with \"hello\" and with \"secret42\", and print what it tells you." },
    ],
  },

  // ---------- Chapter 7: dictionaries ----------
  ch7_r1: {
    output: [{ expr: py`isinstance(ns.get('character'), dict) and ${CH7_R1}(L, ns['character'])` }],
    probes: [
      { expr: py`set(ns.get('character', {})) >= {'name', 'class', 'level', 'health'} and all(isinstance(ns['character'][k], (int, float)) for k in ('level', 'health'))`, hint: "Your character dictionary needs the keys name, class, level and health, with numbers for level and health." },
      { expr: py`${CH7_R1}(rerun({'character': "{'name': 'Zed', 'class': 'Bard', 'level': 99, 'health': 7}"})[0], {'name': 'Zed', 'class': 'Bard', 'level': 99, 'health': 7})`, hint: "Print each value by looking it up with its key, like character[\"name\"], instead of typing it." },
    ],
  },
  // The printed dict can follow a label, as in print("Final player:", player) (fixture ALT_labelled). Its
  // entries are compared as text, in any order, so a line holding something else in braces can't raise
  // (ast.literal_eval would, and that fails the whole check).
  ch7_r2: {
    output: [{ expr: py`any(m and sorted(re.sub(r'\s*:\s*', ': ', p.strip()) for p in m.group(1).replace('"', "'").split(',')) == ["'gold': 75", "'level': 1", "'name': 'Hero'", "'title': 'Adventurer'", "'xp': 100"] for m in (re.search(r'\{(.*)\}', l) for l in L))` }],
    probes: [
      { expr: py`ns.get('player') == {'name': 'Hero', 'xp': 100, 'gold': 75, 'level': 1, 'title': 'Adventurer'}`, hint: "Change the player dictionary itself, one step at a time, then print player." },
      { expr: py`rerun({'player': "{'name': 'Hero', 'xp': 5, 'gold': 10}"})[1].ns.get('player', {}).get('gold') == 35`, hint: "Increase gold by adding 25 to what it already is, instead of typing the new total." },
      // xp starts at 0, so xp += 100 also gives 100 in the main run (fixture wrong/xp_added).
      { expr: py`rerun({'player': "{'name': 'Hero', 'xp': 5, 'gold': 10}"})[1].ns.get('player', {}).get('xp') == 100`, hint: "Set xp to exactly 100 with =, instead of adding 100 to it." },
    ],
  },
  // Changed from the prototype, which wanted the key: value lines first and a 55 anywhere after them: see
  // BLOCK_THEN_TOTAL. The concept was calls('items') >= 1, which a bare stats.items() line passed
  // (wrong/adv_items_statement).
  ch7_r3: {
    output: [{ expr: py`${BLOCK_THEN_TOTAL}(L, ['strength: 15', 'speed: 12', 'magic: 8', 'luck: 20'], 55)` }],
    concepts: [{ expr: py`${LOOPS_OVER}('items')`, hint: "Loop over the dictionary with for key, value in stats.items(): to get each key and value together." }],
    probes: [
      { expr: py`${BLOCK_THEN_TOTAL}(rerun({'stats': "{'a': 1, 'b': 2}"})[0], ['a: 1', 'b: 2'], 3)`, hint: "Print the keys and values and add up the total straight from the stats dictionary, instead of typing them." },
    ],
  },
  // A place's name and numbers don't have to share a line: printing the name, then each property on its own
  // line, is fine (fixture ALT_nested_loop). The task says to loop through and print each location, so the
  // places do need lines of their own, which print(world) doesn't give them (wrong/print_world).
  ch7_r4: {
    output: [
      { expr: py`has('forest', '3', '5', 'cave', '8', '10', 'village', '1', '2', L=L[:-1])` },
      { expr: py`subseq([r're:.*\bforest\b.*', r're:.*\bcave\b.*', r're:.*\bvillage\b.*'], L=L[:-1])`, hint: "Loop through world and print each place on its own line, with its danger and treasure." },
      { expr: py`'cave' in L[-1]` },
    ],
    probes: [
      { expr: py`ns.get('world') == {'forest': {'danger': 3, 'treasure': 5}, 'cave': {'danger': 8, 'treasure': 10}, 'village': {'danger': 1, 'treasure': 2}}`, hint: "Make the world dictionary just like the task shows, with a small dictionary inside for each place." },
      // mine's danger is 1, not the prototype's 9: with 9, mine had the most danger too, so a loop that
      // compared danger instead of treasure passed (fixture wrong/max_danger).
      { expr: py`'mine' in rerun({'world': "{'mine': {'danger': 1, 'treasure': 50}, 'cave': {'danger': 8, 'treasure': 10}}"})[0][-1]`, hint: "Find the place with the most treasure by comparing each place's treasure, so it would work for any world." },
    ],
  },
  // A member's name and stats don't have to share a line (fixture ALT_multi_line). Changed from also
  // wanting the defense values: the content's first hint prints only the attack (fixture adv_follows_hint).
  ch7_r5: {
    output: [
      { expr: py`has('Knight', '15', 'Mage', '20', 'Rogue', '12', L=L[:-1])` },
      { expr: py`'Mage' in L[-1]` },
    ],
    probes: [
      // The re-run party has 3 members with the best last. The prototype's had Rogue at index 1, where
      // Mage is in the task's party, so a typed party[1] passed (fixture wrong/typed_index).
      { expr: py`'Rogue' in rerun({'party': "[{'name': 'Knight', 'attack': 1, 'defense': 1}, {'name': 'Mage', 'attack': 2, 'defense': 1}, {'name': 'Rogue', 'attack': 30, 'defense': 1}]"})[0][-1]`, hint: "Find the member with the highest attack by comparing their attack values, then print that member's name." },
    ],
  },
  // Each line can have a label before its value, like "Shield: None" (fixture adv_labels).
  ch7_s1: {
    output: [{ expr: py`lines([r're:(?:.*\W)?Aria', r're:(?:.*\W)?unarmed', r're:(?:.*\W)?None'])` }],
    // Changed from calls('get') >= 3: hero.get("shield", "None") types the None in as a default
    // (wrong/adv_default_string_none). The name and the shield take one argument, the weapon two.
    concepts: [{ expr: py`(lambda G: sum(len(c.args) == 1 and not c.keywords for c in G) >= 2 and any(len(c.args) + len(c.keywords) == 2 for c in G))([n for n in ast.walk(TREE) if isinstance(n, ast.Call) and isinstance(n.func, ast.Attribute) and n.func.attr == 'get'])`, hint: "Use hero.get() for all three lookups, as the task shows: give a default only for the weapon, and none for the shield." }],
    probes: [
      // The re-run hero has a weapon and a shield, so a typed "unarmed" or "None" shows (wrong/adv_typed_none).
      { expr: py`lines([r're:(?:.*\W)?Zed', r're:(?:.*\W)?bow', r're:(?:.*\W)?oak'], L=rerun({'hero': "{'name': 'Zed', 'weapon': 'bow', 'shield': 'oak'}"})[0])`, hint: "Print what hero.get() gives back each time, instead of typing the answers." },
    ],
  },
  ch7_s2: {
    output: [{ expr: py`${COUNT_LINES}(L, [('m', 1), ('i', 4), ('s', 4), ('p', 2)])` }],
    probes: [
      { expr: py`{'m': 1, 'i': 4, 's': 4, 'p': 2} in globals_of(dict)`, hint: "Count the letters in a dictionary: add 1 to a letter's count each time you see it." },
      // The re-run checks the printed counts too, not only the dict (wrong/adv_typed_output).
      { expr: py`(lambda t, r: {'b': 1, 'a': 3, 'n': 2} in [v for k, v in r.ns.items() if isinstance(v, dict) and not k.startswith('__')] and ${COUNT_LINES}(t, [('b', 1), ('a', 3), ('n', 2)]))(*rerun({'word': "'banana'"}))`, hint: "Loop over the letters of word to build your counts, then print each letter and count from your dictionary, so it would work for any word." },
    ],
  },
  ch7_s3: {
    output: [{ expr: py`has('{1: 1, 2: 8, 3: 27, 4: 64, 5: 125}', "{'cat': 3, 'elephant': 8, 'dog': 3}")` }],
    concepts: [{ expr: py`count(ast.DictComp) >= 2`, hint: "Build both dictionaries with dict comprehensions: the one-line {key: value for ...} shorthand." }],
    probes: [
      { expr: py`ns.get('cubes') == {1: 1, 2: 8, 3: 27, 4: 64, 5: 125} and ns.get('lengths') == {'cat': 3, 'elephant': 8, 'dog': 3}`, hint: "Store your two dictionaries in variables named cubes and lengths, like the task shows." },
    ],
  },
  // Changed from len(L) >= 4: a 3-line report (name and class, stats, inventory) is a correct answer
  // (fixture ALT_compact). 3 lines still rejects print(char), which isn't printing it nicely (wrong/raw_dict).
  ch7_boss: {
    output: [{ expr: py`len(L) >= 3` }],
    probes: [
      { expr: py`any(isinstance(d.get('stats'), dict) and set(d['stats']) >= {'strength', 'speed', 'magic'} and isinstance(d.get('inventory'), list) and all(isinstance(x, str) for x in d['inventory']) and 'name' in d and 'char_class' in d for d in globals_of(dict))`, hint: "Make a character dictionary with name, char_class, a stats dictionary (strength, speed, magic) and an inventory list of item names." },
      { expr: py`sig('display_character') == (1, 0) and 'display_character' in trace`, hint: "Write display_character with one parameter for the character, and call it." },
      // The test character is a copy of the kid's own with new values, so extra keys such as a level are
      // still there for display_character to print (fixture adv_extra_level_field).
      { expr: py`(lambda C: bool(C) and (lambda t: all(s in '\n'.join(t) for s in ['Zed', 'Bard', '71', '72', '73', 'rope', 'lamp']))(callf('display_character', dict(C[0], name='Zed', char_class='Bard', stats=dict(C[0]['stats'], strength=71, speed=72, magic=73), inventory=['rope', 'lamp']))[1]))([d for d in globals_of(dict) if isinstance(d.get('stats'), dict) and 'name' in d and 'char_class' in d])`, hint: "display_character should print every detail of the character it is given: use its parameter, not your own variable." },
    ],
  },
  grind_12: {
    output: [{ expr: py`${COUNT_LINES}(L, [('the', 3), ('cat', 2), ('sat', 1), ('on', 1), ('mat', 1)])` }],
    probes: [
      { expr: py`{'the': 3, 'cat': 2, 'sat': 1, 'on': 1, 'mat': 1} in globals_of(dict)`, hint: "Store the counts in a dictionary, with each word as a key and its count as the value." },
      // Changed from 'a b a': the re-run checks the printed counts too (wrong/adv_typed_output), and "a" is
      // inside "cat", so text.count(word) counts 3 of them (wrong/adv_substring_count).
      { expr: py`(lambda t, r: {'a': 2, 'cat': 1} in [v for k, v in r.ns.items() if isinstance(v, dict) and not k.startswith('__')] and ${COUNT_LINES}(t, [('a', 2), ('cat', 1)]))(*rerun({'text': "'a cat a'"}))`, hint: "Split text into words and count each word in a loop, then print the counts from your dictionary, so it would work for any text." },
    ],
  },
  grind_13: {
    // Only the lines naming a contact and its phone count, so a title line is fine (fixture adv_header).
    output: [{ expr: py`len(globals_of(dict)) >= 1 and (lambda d: len([l for l in L if any(str(k) in l and str(v) in l for k, v in d.items())]) == len(d) and all(any(str(k) in l and str(v) in l for l in L) for k, v in d.items()))(globals_of(dict)[0])` }],
    concepts: [
      { expr: py`any(isinstance(n, ast.Dict) and len(n.keys) == 3 for n in ast.walk(TREE))`, hint: "Start with a dictionary that has 3 contacts in it, each one a name: phone pair." },
      // The task only says "add one", so .update() and .setdefault() count too (fixture ALT_update).
      { expr: py`any(isinstance(n, ast.Assign) and isinstance(n.targets[0], ast.Subscript) for n in ast.walk(TREE)) or calls('update') >= 1 or calls('setdefault') >= 1`, hint: "Add one new contact to your dictionary, for example with your_dict[name] = phone." },
      { expr: py`count(ast.Delete) >= 1 or calls('pop') >= 1`, hint: "Delete one contact with del or .pop()." },
      // As in ch7_r3, a bare .items() call doesn't count.
      { expr: py`${LOOPS_OVER}('items')`, hint: "Print the contacts by looping over .items(), as the task asks." },
    ],
    probes: [
      { expr: py`any(len(d) == 3 for d in globals_of(dict))`, hint: "After adding one contact and deleting one, your dictionary should end up with 3 contacts." },
    ],
  },

  // ---------- Chapter 8: modules, strings, errors ----------
  // Changed from the prototype, which wanted each line to be the bare value:
  // - labels such as "You rolled a 4" pass (fixture ALT_labels): the roll is one of the line's numbers, so
  //   "You rolled a 3 on a 6-sided die" works too (fixture adv_label_after_number), the line names one
  //   item, and the list is found inside its line;
  // - each probe patches in two values, not one: seed 0 rolls a 4, so a typed print(4) matched the one
  //   patched value (wrong/fixed_die), and one value is always matchable by typing it;
  // - randint must be called with (1, 6): at seed 0, randint(0, 5) rolls a number from 1 to 6 too
  //   (wrong/adv_randint_0_5).
  ch8_r1: {
    output: [{ expr: py`len(L) >= 3 and any(1 <= i <= 6 for i in ints(L[0])) and sum(w in L[1] for w in ('sword', 'shield', 'potion')) == 1 and sorted(__import__('ast').literal_eval(re.search(r'\[.*\]', L[2]).group())) == [1, 2, 3, 4, 5]` }],
    probes: [
      { expr: py`all(v in ints(rerun(patches={'random.randint': lambda a, b, v=v: v})[0][0]) for v in (2, 5))`, hint: "Roll the die with random.randint(1, 6) and print what it gives you." },
      { expr: py`(lambda w: (rerun(patches={'random.randint': w[0]}), bool(w[1]) and all(c == (1, 6) for c in w[1]))[1])(rec('random.randint'))`, hint: "A die has 6 sides, so roll it with random.randint(1, 6): that gives a number from 1 to 6." },
      { expr: py`all(v in rerun(patches={'random.choice': lambda s, v=v: v})[0][1] for v in ('potion', 'sword'))`, hint: "Pick the item with random.choice() and print what it gives you." },
      { expr: py`all(s in rerun(patches={'random.shuffle': f})[0][2] for f, s in ((lambda x: x.reverse(), '[5, 4, 3, 2, 1]'), (lambda x: x.append(x.pop(0)), '[2, 3, 4, 5, 1]')))`, hint: "Shuffle your list with random.shuffle(), then print the list itself." },
    ],
  },
  // The startswith answer is read from the last line as a yes or a no, so "Yes, it starts with the" works
  // as well as True (fixture adv_if_yes). The prototype wanted a True after the joined words.
  ch8_r2: {
    output: [{ expr: py`has('6', 'the - quick - brown - fox - jumps - over') and polarity(L[-1]) == 1` }],
    probes: [
      { expr: py`(lambda t: has('3', 'hello - big - world', L=t) and polarity(t[-1]) == -1)(rerun({'sentence': "'  hello big world '"})[0])`, hint: "Get each answer from sentence with strip(), split(), len(), join() and startswith(), so they'd change for a different sentence." },
    ],
  },
  // Changed from exactly 3 lines: a line before each test is fine (fixture adv_announce_each).
  ch8_r3: {
    output: [{ expr: py`len([l for l in L if l.strip()]) >= 3` }],
    concepts: [
      { expr: py`count(ast.Try) >= 3`, hint: "Write three separate try/except blocks, one for each error." },
      { expr: py`{'ValueError', 'ZeroDivisionError', 'KeyError'} <= {h.type.id for h in ast.walk(TREE) if isinstance(h, ast.ExceptHandler) and isinstance(h.type, ast.Name)}`, hint: "Name the error in each except: ValueError, ZeroDivisionError and KeyError." },
    ],
    probes: [
      // Each except block's message must show up, so the error really happened. Try blocks around int("5")
      // or 10 / 2 never reach their except (wrong/adv_no_errors_raised). The message is the longest piece
      // of text in the block's print() calls, leaving out {...} and %s parts; a block with no text is skipped.
      { expr: py`(lambda H: len(H) >= 3 and all((lambda cs: not cs or max(cs, key=len) in out)([p.strip().replace('️', '') for st in h.body for c in ast.walk(st) if isinstance(c, ast.Call) and getattr(c.func, 'id', '') == 'print' for s in ast.walk(c) if isinstance(s, ast.Constant) and isinstance(s.value, str) for p in re.split(r'\{[^{}]*\}|%\S', s.value) if p.strip()]) for h in H))([h for h in ast.walk(TREE) if isinstance(h, ast.ExceptHandler) and isinstance(h.type, ast.Name) and h.type.id in ('ValueError', 'ZeroDivisionError', 'KeyError')])`, hint: "Each try should run the risky code from the task, like int(\"hello\"), so the error really happens and your except block prints its message." },
    ],
  },
  // The last line only has to name Sam: "print the highest scorer" doesn't ask for the score
  // (fixture ALT_name_only). The prototype also wanted 92 on it. The records don't need a line each:
  // print(records) prints them all (fixture ALT_print_records).
  ch8_r4: {
    output: [{ expr: py`has('Alex', '85', 'Sam', '92', 'Jo', '78', 'Max', '88', L=L[:-1]) and 'Sam' in L[-1]` }],
    probes: [
      { expr: py`ns.get('records') == [{'name': 'Alex', 'score': 85}, {'name': 'Sam', 'score': 92}, {'name': 'Jo', 'score': 78}, {'name': 'Max', 'score': 88}]`, hint: "Store each record in records as a dictionary with a name and a score, and turn the score into a number with int()." },
      // Bob is third in the re-run data. The prototype's 'Ann,1\nBob,5' put him at index 1, where Sam
      // is in the task's data, so a typed records[1] passed (fixture wrong/typed_index).
      { expr: py`'Bob' in rerun({'data': "'Ann,1\\nCy,2\\nBob,5'"})[0][-1]`, hint: "Find the highest scorer by comparing the scores in records, so it would work for any data." },
    ],
  },
  // The prototype called val('add_item')(inv, ...), which runs the kid's function outside the hidden-run
  // time limit and doesn't put builtins back afterwards. callf does both, so every call goes through it.
  ch8_r5: {
    output: [{ expr: py`len(L) >= 4` }],
    probes: [
      { expr: py`(lambda inv: (callf('add_item', inv, 'Zed', 42), len(inv) == 1 and isinstance(inv[0], dict) and 'Zed' in inv[0].values() and 42 in inv[0].values())[1])([])`, hint: "add_item should add one dictionary, holding the item's name and quantity, to the end of the list it is given." },
      // Searches for the second of two items: an else: return None inside the loop gives up after the first
      // item (wrong/adv_early_return_none).
      { expr: py`(lambda inv: (callf('add_item', inv, 'Zed', 42), callf('add_item', inv, 'Yan', 7), callf('find_item', inv, 'Yan')[0] is inv[1] and callf('find_item', inv, 'Zed')[0] is inv[0] and callf('find_item', inv, 'nope')[0] is None)[2])([])`, hint: "find_item should check every item and return the matching item's dictionary, or None when nothing matches." },
      { expr: py`(lambda inv: (callf('add_item', inv, 'Zed', 42), callf('add_item', inv, 'Yan', 7), (lambda t: len(t) == 2 and 'Zed' in t[0] and '42' in t[0] and 'Yan' in t[1])(callf('display', inv)[1]))[2])([])`, hint: "display should print one line for each item in the list it is given." },
      { expr: py`trace.count('add_item') >= 3 and 'display' in trace and 'find_item' in trace`, hint: "Your program should call add_item 3 times, then display, then find_item." },
    ],
  },
  // Added a re-run probe: output checks alone passed the table typed out in five prints (fixture
  // wrong/hardcoded). The alignment check gets its own hint, because the default one says the output
  // doesn't match when only the spacing is off.
  // Spaces between the $ and the price are fine: the content's first hint, ${price:>6.2f}, prints
  // "$ 29.99" (fixture adv_follows_hint), and the alignment check still applies.
  ch8_s1: {
    output: [
      { expr: py`lines([r're:Item\s+Price', r're:-{5,}', r're:Sword\s+\$\s*29\.99', r're:Shield\s+\$\s*15\.50', r're:Potion\s+\$\s*3\.00'])` },
      { expr: py`len({len(l) for l in L[2:]}) == 1`, hint: "So close! Line up the prices so they all end in the same column, like the table in the task." },
    ],
    probes: [
      { expr: py`(lambda t: len(t) == 3 and re.fullmatch(r'Axe\s+\$\s*5\.50', t[2]) is not None)(rerun({'items': "[('Axe', 5.5)]"})[0])`, hint: "Print the rows by looping over the items list, so the table would change if the items did." },
    ],
  },
  // banana and cherry both have 6 letters, so either order is sorted by length. A kid who sorts words in
  // place first gets banana before cherry (fixture ALT_sort_in_place); the prototype only took cherry first.
  ch8_s2: {
    output: [{ expr: py`has("['apple', 'banana', 'cherry']", "['apple', 'cherry', 'banana']") or has("['apple', 'banana', 'cherry']", "['apple', 'banana', 'cherry']")` }],
    concepts: [{ expr: py`any(isinstance(n, ast.Call) and getattr(n.func, 'id', '') == 'sorted' and any(k.arg == 'key' and isinstance(k.value, ast.Lambda) for k in n.keywords) for n in ast.walk(TREE))`, hint: "For the length sort, use sorted() with key= and a lambda, as the task asks." }],
    probes: [
      { expr: py`getattr(ns.get('double'), '__name__', '') == '<lambda>' and val('double(7)') == 14`, hint: "Make double with lambda (not def), so that double(7) gives back 14." },
      // print(double) prints "<function <lambda> at 0x...>", whose address has digits (wrong/adv_prints_function).
      { expr: py`any(re.search(r'-?\d', l) and '<function' not in l for l in L[:max(1, len(L) - 2)])`, hint: "Test your lambda: print what double gives back for a number, like print(double(5)), before the sorted lists." },
      // With a different double, the test line must change, so a typed print(10) fails (wrong/typed_double_test).
      // The + 1 changes double(0) too.
      { expr: py`L[:max(1, len(L) - 2)] != (lambda t: t[:max(1, len(t) - 2)])(rerun({'double': 'lambda x: x * 2 + 1'})[0])`, hint: "Print what double gives back, like print(double(5)), instead of typing the answer." },
      // A re-run with words that have no ties, so sorting alphabetically and by length give different lists:
      // key=lambda w: w passed the main run (wrong/adv_key_identity), and so did typed lists next to a sorted()
      // call whose answer was thrown away (wrong/adv_typed_lists).
      { expr: py`has("['banana', 'fig', 'kiwi']", "['fig', 'kiwi', 'banana']", L=rerun({'words': "['kiwi', 'fig', 'banana']"})[0])`, hint: "Print what sorted() gives back for words, once alphabetically and once with key=lambda w: len(w), so your lists would change if the words did." },
    ],
  },
  ch8_s3: {
    output: [{ expr: py`[w for w in re.findall(r'\b(Knight|Mage|Rogue)\b', out)] == ['Mage', 'Knight', 'Rogue', 'Mage', 'Knight', 'Rogue', 'Knight', 'Mage', 'Rogue']` }],
    probes: [
      { expr: py`re.findall(r'\b(Zed|Yan|Xia)\b', '\n'.join(rerun({'heroes': "[{'name': 'Zed', 'power': 1, 'speed': 1}, {'name': 'Yan', 'power': 2, 'speed': 3}, {'name': 'Xia', 'power': 3, 'speed': 2}]"})[0])) == ['Xia', 'Yan', 'Zed', 'Zed', 'Xia', 'Yan', 'Xia', 'Yan', 'Zed']`, hint: "Sort heroes three times with sorted(), each with its own key: power (highest first), speed (lowest first), then name." },
    ],
  },
  // The secret is never seeded by the kid, so the probes patch random.randint to pick it. Grading seeds
  // random with 0, which makes the main run's secret 13: all 4 guesses get used.
  // Changed from the prototype:
  // - the stop check: with the secret 7, the first 3 results must be high, high, correct, and then the
  //   loop must stop. It stopped if check_guess ran fewer times than with the secret 13, whatever the
  //   program prints afterwards, so stats such as "too high: 2, too low: 0" are fine (fixture
  //   ALT_stats_summary). Failing that (say check_guess ran on every guess before the loop), no high or
  //   low may follow the correct guess. The prototype's [:4] == [3 results] also failed a summary line
  //   such as "You got it correct in 3 attempts!" (fixture ALT_result_summary).
  // - the attempts dict can also hold one entry per attempt, like {1: 'low', 2: 'high', ...}
  //   (fixture ALT_history_dict), not only a count of 4. It is read from ns, the globals as the main run
  //   left them: the first probe calls check_guess, which can count attempts too (fixture
  //   ALT_count_in_check_guess), and globals_of() would see those calls. The same dict must then hold 3
  //   (or 3 entries) after the secret-7 re-run, so a typed stats = {"attempts": 4} fails
  //   (wrong/adv_typed_stats).
  // - the re-runs' randint gives the secret on its first call and 1 after that, so picking a new secret
  //   for every guess fails (wrong/adv_secret_in_loop);
  // - the results are read with RESULTS, which also takes "You got it!".
  ch8_boss: {
    output: [{ expr: py`len([l for l in L if re.search(r'(?i)high|low|correct', l)]) >= 1` }],
    probes: [
      { expr: py`[val('check_guess(%d, 3)' % g) for g in (5, 1, 3)] == ['high', 'low', 'correct']`, hint: "check_guess should return \"high\", \"low\" or \"correct\" by comparing the guess with the secret." },
      { expr: py`${RESULTS}(rerun(patches={'random.randint': seq([13, 1, 1, 1])})[0])[:4] == ['low', 'high', 'low', 'correct']`, hint: "Pick the secret once with random.randint(1, 20), before the loop, then check every guess against it with check_guess and print each result." },
      { expr: py`(lambda V, s7, s13: V(s7[0])[:3] == ['high', 'high', 'correct'] and (s7[1].trace.count('check_guess') < s13[1].trace.count('check_guess') or not {'high', 'low'} & set(V(s7[0])[3:])))(${RESULTS}, rerun(patches={'random.randint': seq([7, 1, 1, 1])}), rerun(patches={'random.randint': seq([13, 1, 1, 1])}))`, hint: "Stop the game loop with break once a guess is correct." },
      { expr: py`(lambda r7: any(isinstance(d, dict) and isinstance(r7.ns.get(k), dict) and (any(d.get(j) == 4 and r7.ns[k].get(j) == 3 for j in d) or len(d) == 4 and len(r7.ns[k]) == 3) for k, d in ns.items() if not k.startswith('__')))(rerun(patches={'random.randint': seq([7, 1, 1, 1])})[1])`, hint: "Keep track of the attempts in a dictionary, like stats = {\"attempts\": 0}, and add 1 to it for each guess." },
    ],
  },
  // len(L) >= 2, not == 2: a safe_divide that prints its own warning and returns None prints 3 lines
  // (fixture ALT_prints_message). The task doesn't say what to give back for b = 0, so returning 0 is
  // fine (fixture ALT_return_zero; the prototype wanted a message), and 10 / 3 can print rounded
  // (fixture ALT_rounded). The probes check the function itself. The 10 / 3 answer can be on any line before
  // the last, after a title line say (fixture adv_header); the prototype wanted it first.
  grind_14: {
    output: [{ expr: py`len(L) >= 2 and nums_approx([10/3], tol=0.05, L=L[:-1])` }],
    concepts: [{ expr: py`count(ast.Try) >= 1`, hint: "Use try: and except: inside safe_divide to catch the divide-by-zero error." }],
    probes: [
      { expr: py`val('safe_divide(10, 4)') == 2.5`, hint: "safe_divide should return a / b when b isn't zero." },
      { expr: py`not (isinstance(val('safe_divide(1, 0)'), tuple) and val('safe_divide(1, 0)')[:1] == ('__error__',))`, hint: "Put the try/except inside safe_divide, so calling it with b = 0 never crashes." },
      // A correct safe_divide that is never called, next to typed answers, passed without this
      // (wrong/adv_typed_first). A safe_divide that prints its own warning for b = 0 can be called on a line
      // by itself (USES_ANSWER).
      { expr: py`trace.count('safe_divide') >= 2 and ${USES_ANSWER}('safe_divide', 1, 0)`, hint: "Test your function: print what safe_divide(10, 3) and safe_divide(10, 0) give back." },
    ],
  },
  // The rolls are the lines before the last one that hold 2 or more numbers, not simply the first 10 lines,
  // so an extra "Doubles!" line after a roll is fine (fixture ALT_doubles_line; seed 0 rolls doubles first).
  // A roll's dice are its last 2 numbers once DICE drops labels, so "Die 1: 3, Die 2: 5" is a 3 and a 5
  // (fixture ALT_die_labels).
  grind_15: {
    output: [
      { expr: py`(lambda D: (lambda r: len(r) == 10 and all(1 <= d <= 6 for l in r for d in D(l)[-2:]))([l for l in L[:-1] if len(D(l)) >= 2]))(${DICE})` },
      { expr: py`(lambda D: ints(L[-1])[-1:] == [sum(1 for l in L[:-1] if len(D(l)) >= 2 and D(l)[-2] == D(l)[-1])])(${DICE})` },
    ],
    probes: [
      { expr: py`ints(rerun(patches={'random.randint': lambda a, b: 3})[0][-1])[-1:] == [10]`, hint: "Roll both dice with random.randint inside your loop, and add 1 to your count every time they match." },
      { expr: py`ints(rerun(patches={'random.randint': seq([1, 2])})[0][-1])[-1:] == [0]`, hint: "Only count a roll as doubles when both dice show the same number." },
    ],
  },
};
