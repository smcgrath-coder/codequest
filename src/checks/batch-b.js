// Grading rules for chapters 5-8 and practice grind_8-15 (ported from rules_b.py). Format: see src/checks.js.
// py`...` is String.raw: each expr is the Python text exactly as written, backslashes and quotes included.
// Two rules share a Python helper between checks, spliced in with ${...}; no other expr uses ${.
const py = String.raw;

// ch5_s1: the yes/no answers, 1 or -1, in order.
// - When exactly 4 lines name a searched book, each answer is its named line plus the lines after it, up
//   to the next named line (so print(book) then print(book in library) works: fixture ALT_name_then_bool).
//   The last answer gets as many lines as the first, so a heading or a closing line is left out. An answer
//   is no if it says so, and yes otherwise: the engine's polarity() gives 0 for "Python exists" or "we have
//   it", and its n't can't match inside "don't" (fixtures ALT_exists, ALT_have_it).
// - Otherwise, as for print("Python" in library), the answers are the lines polarity() reads as yes or no
//   (fixture ALT_bools).
const CH5_S1_ANSWERS = py`(lambda t: (lambda idx: [-1 if re.search(r"(?i)\b(no|not|nope|false|missing|unavailable|isnt|doesnt|dont|wasnt)\b|n['’]t\b|❌", ' '.join(t[i:j])) else 1 for i, j in zip(idx, idx[1:] + [idx[-1] + idx[1] - idx[0]])] if len(idx) == 4 else [p for p in map(polarity, t) if p])([i for i, l in enumerate(t) if re.search(r'\b(Python|Ruby|Games|Math)\b', l)]))`;

// grind_15: the numbers on a line, leaving out labels such as "Die 1" or "2nd die". Dice are never
// negative, so "3-5" is two dice.
const DICE = py`(lambda l: [int(x) for x in re.findall(r'\d+', re.sub(r'(?i)\b(?:die|dice)\s*#?\d+|\b\d+(?:st|nd|rd|th)\b', '', l))])`;

export const BATCH_B = {
  // ---------- Chapter 5: lists ----------
  // Changed from the prototype: each line only has to contain its value, so labels such as "First: pizza"
  // pass (fixture ALT_labels). The re-run list has 5 items with distinct names, so a typed print(4) for
  // the length fails (wrong/typed_length) and a label can't match an item by accident.
  ch5_r1: {
    output: [{ expr: py`isinstance(ns.get('favorites'), list) and len(L) == 4 and all(str(v) in l for v, l in zip([ns['favorites'][0], ns['favorites'][-1], ns['favorites'][1]], L)) and nums([len(ns['favorites'])], L=L[3:])` }],
    probes: [
      { expr: py`isinstance(ns.get('favorites'), list) and len(ns['favorites']) == 4`, hint: "Your favorites list should have exactly 4 things in it." },
      { expr: py`(lambda t: len(t) == 4 and 'Zappa' in t[0] and 'Quux' in t[1] and 'Yoyo' in t[2] and nums([5], L=t[3:]))(rerun({'favorites': "['Zappa', 'Yoyo', 'Wren', 'Vole', 'Quux']"})[0])`, hint: "Print the items by their index, like favorites[0], and the count with len(), so it would work for any list." },
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
  // "index 2 to 4" reads as [2:4] or [2:5], and the output check takes both. The prototype's re-run only
  // took [2:4]: "['c', 'd']" isn't in "['c', 'd', 'e']" (fixture ALT_inclusive_middle), so it takes both too.
  ch5_r4: {
    output: [{ expr: py`has("['map', 'torch', 'key']", "['scroll', 'ring']") and (has("['key', 'gem']") or has("['key', 'gem', 'scroll']")) and nums([6])` }],
    probes: [
      { expr: py`(lambda t: has("['a', 'b', 'c']", "['f', 'g']", L=t) and (has("['c', 'd']", L=t) or has("['c', 'd', 'e']", L=t)) and nums([7], L=t))(rerun({'items': "['a','b','c','d','e','f','g']"})[0])`, hint: "Use slices that work for any list, like items[:3] and items[-2:], and len(items) for the count." },
    ],
  },
  ch5_r5: {
    output: [{ expr: py`has("['quick', 'jumps', 'over', 'lazy']") and nums([4])` }],
    probes: [
      { expr: py`ns.get('long_words') == ['quick', 'jumps', 'over', 'lazy']`, hint: "Build long_words from the words list, adding each word that has more than 3 letters." },
      { expr: py`rerun({'words': "['hello', 'hi', 'world']"})[1].ns.get('long_words') == ['hello', 'world']`, hint: "Check each word's length with len() inside your loop, so it would work for any list of words." },
    ],
  },
  ch5_s1: {
    output: [{ expr: py`${CH5_S1_ANSWERS}(L) == [1, -1, 1, -1]` }],
    probes: [
      { expr: py`${CH5_S1_ANSWERS}(rerun({'library': "['Ruby', 'Math']"})[0]) == [-1, 1, -1, 1]`, hint: "Check each name with the in keyword, so your answers would change if the library changed." },
    ],
  },
  ch5_s2: {
    output: [{ expr: py`lines(['0: Link', '1: Mario', '2: Samus', '3: Kirby'])` }],
    concepts: [{ expr: py`calls('enumerate') >= 1`, hint: "This room is about enumerate(). Use it in your for loop to get each hero's number and name together." }],
    probes: [
      { expr: py`rerun({'heroes': "['A', 'B']"})[0] == ['0: A', '1: B']`, hint: "Print the number and name that enumerate() gives you, instead of typing them." },
    ],
  },
  ch5_s3: {
    output: [{ expr: py`has('[2, 4, 6, 8, 10]', "['hello', 'howdy']")` }],
    concepts: [{ expr: py`count(ast.ListComp) >= 2`, hint: "Build both lists with list comprehensions: the one-line [... for ... in ...] shorthand." }],
    probes: [
      { expr: py`ns.get('doubles') == [2, 4, 6, 8, 10] and ns.get('long') == ['hello', 'howdy']`, hint: "Store your two lists in variables named doubles and long, like the task shows." },
    ],
  },
  ch5_boss: {
    output: [{ expr: py`len(L) >= 5 and L[:4] == ['Sword x1', 'Potion x5', 'Arrow x20', 'Gem x3'] and nums([29], L=L[4:])` }],
    probes: [
      { expr: py`ns.get('inventory') == ['Sword', 'Potion', 'Arrow', 'Gem'] and ns.get('counts') == [1, 5, 20, 3]`, hint: "Change the inventory and counts lists themselves: add Gem to both, and take Shield out of both." },
      { expr: py`(lambda t: t[:2] == ['Bow x7', 'Gem x3'] and nums([10], L=t[2:]))(rerun({'inventory': "['Shield', 'Bow']", 'counts': '[2, 7]'})[0])`, hint: "Find where Shield is with inventory.index() instead of typing its position, and add up the counts with your code." },
    ],
  },
  grind_8: {
    output: [{ expr: py`has('[12, 23, 17, 21]') and nums([4], L=L[-1:])` }],
    probes: [
      { expr: py`(lambda t: has('[11, 50]', L=t) and nums([2], L=t[-1:]))(rerun({'numbers': '[11, 3, 50]'})[0])`, hint: "Build your new list from numbers with a loop, and print its len(), so it would work for any numbers." },
    ],
  },
  grind_9: {
    output: [{ expr: py`has('[5, 4, 3, 2, 1]')` }],
    concepts: [
      { expr: py`calls('reverse') == 0`, hint: "The task says not to use .reverse(). Build the reversed list yourself." },
      { expr: py`count(ast.For, ast.While) >= 1`, hint: "Use a for or while loop to build your new reversed list." },
    ],
    probes: [
      { expr: py`has('[9, 8, 7]', L=rerun({'original': '[7, 8, 9]'})[0])`, hint: "Build the reversed list from original with your loop, so it would work for any list." },
    ],
  },

  // ---------- Chapter 6: functions ----------
  ch6_r1: {
    output: [{ expr: py`len(L) == 3 and L[0].strip() != '' and L[0] == L[1] == L[2]` }],
    probes: [
      { expr: py`sig('battle_cry') == (0, 0)`, hint: "Define a function called battle_cry with def and empty parentheses: it doesn't need any inputs." },
      { expr: py`call('battle_cry()')[1] == L[:1]`, hint: "Each call to battle_cry() should print your war cry once. Call it 3 times instead of looping inside it." },
      { expr: py`trace.count('battle_cry') == 3`, hint: "Call battle_cry() exactly 3 times." },
    ],
  },
  // A line that differs from "[name] — Level [level]" only in capitals or punctuation, like "Knight - level 5",
  // is a near miss (the design's rule): it still fails, but with a hint that says so (wrong/lowercase_level).
  ch6_r2: {
    output: [
      { expr: py`len(L) == 3 and len(set(L)) == 3 and all(re.fullmatch(r'(?i).+?\W*level\W*\S+', l) for l in L)` },
      { expr: py`all(re.fullmatch(r'.+?\s*[—–-]+\s*Level\s+\S+', l) for l in L)`, hint: "So close! Check your capital letters and punctuation: each line should look like [name] — Level [level] from the task (a - is fine for the —)." },
    ],
    probes: [
      { expr: py`sig('hero_status') == (2, 0)`, hint: "hero_status needs two parameters in its parentheses: one for the name and one for the level." },
      { expr: py`(lambda t: len(t) == 1 and 'Zed' in t[0] and '99' in t[0])(call("hero_status('Zed', 99)")[1])`, hint: "hero_status should print the name and level it is given, using its parameters." },
      { expr: py`trace.count('hero_status') == 3`, hint: "Call hero_status 3 times, once for each hero." },
    ],
  },
  ch6_r3: {
    output: [{ expr: py`len(L) == 1 and re.fullmatch(r'Damage dealt: (\S+)', L[0]) is not None` }],
    probes: [
      { expr: py`call('calculate_damage(4, 5)') == (20, []) and val('calculate_damage(3, 0.5)') == 1.5`, hint: "calculate_damage should give back base * multiplier with return, not print it." },
      { expr: py`any(str(v) == L[0].split(': ', 1)[1] for k, v in ns.items() if not k.startswith('__') and not callable(v))`, hint: "Store the answer from calculate_damage in a variable first, then print that variable." },
    ],
  },
  ch6_r4: {
    output: [{ expr: py`any(re.fullmatch(r'.+ gained 10 power!', l) for l in L) and any(re.fullmatch(r'.+ gained (?!10 )-?\d+(\.\d+)? power!', l) for l in L)` }],
    probes: [
      { expr: py`sig('power_up') == (2, 1)`, hint: "Give power_up two parameters, name and amount, and make amount 10 unless it's given." },
      { expr: py`call("power_up('Zed')")[0] == 'Zed gained 10 power!'`, hint: "power_up should return the message instead of printing it. Print what it gives back." },
      { expr: py`val("power_up('Zed', 7)") == 'Zed gained 7 power!'`, hint: "Put the amount parameter in the message, so a custom amount shows up in it." },
      // The output check alone passes a second message typed into print() (fixture wrong/typed_second).
      { expr: py`{len(n.args) + len(n.keywords) for n in ast.walk(TREE) if isinstance(n, ast.Call) and getattr(n.func, 'id', '') == 'power_up'} >= {1, 2}`, hint: "Call power_up twice and print what it gives back: once with just a name, and once with a name and your own amount." },
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
  ch6_s1: {
    output: [{ expr: py`nums_per_line([10, 30, 55])` }],
    probes: [
      { expr: py`val('calc_attack(2)') == 6 and val('calc_defense(2)') == 9 and val('power_rating(2)') == 15`, hint: "Make each function return the answer to its formula from the task, using its level parameter." },
      { expr: py`called_from('calc_attack', 'power_rating') and called_from('calc_defense', 'power_rating')`, hint: "power_rating should call calc_attack and calc_defense and add up what they return." },
    ],
  },
  ch6_s2: {
    output: [
      { expr: py`has('Help on function calculate_area', 'calculate_area(width, height)')` },
      { expr: py`isinstance(ns.get('calculate_area'), type(lambda: 0)) and bool(ns['calculate_area'].__doc__) and ns['calculate_area'].__doc__.strip().splitlines()[0].strip() in out` },
    ],
    probes: [
      { expr: py`val('calculate_area(3, 4)') == 12`, hint: "calculate_area should return width * height." },
      { expr: py`bool((ns['calculate_area'].__doc__ or '').strip())`, hint: "Put a docstring, a string in triple quotes, on the first line inside calculate_area." },
    ],
  },
  ch6_s3: {
    output: [{ expr: py`len(L) == 2 and nums([50], L=L[:1]) and nums([100], L=L[1:])` }],
    concepts: [
      { expr: py`any_func_assigns('score')`, hint: "Inside your function, make its own score = 50 before printing it." },
      { expr: py`count(ast.Global) == 0`, hint: "Don't use the global keyword here: the function's score should stay separate from the one outside." },
    ],
    probes: [
      { expr: py`ns.get('score') == 100`, hint: "Keep a variable called score, equal to 100, outside the function." },
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
      { expr: py`val('celsius_to_fahrenheit(100)') == 212 and val('celsius_to_fahrenheit(-40)') == -40`, hint: "celsius_to_fahrenheit should return its answer (not print it), so it works for any temperature." },
      { expr: py`val('fahrenheit_to_celsius(32)') == 0 and val('fahrenheit_to_celsius(212)') == 100`, hint: "fahrenheit_to_celsius should return its answer (not print it), so it works for any temperature." },
    ],
  },
  grind_11: {
    output: [{ expr: py`[p for p in map(polarity, L) if p] == [-1, 1]` }],
    probes: [
      { expr: py`[val('is_strong(%r)' % p) for p in ['hello', 'secret42', 'abcdefgh', 'abc1', '12345678']] == [False, True, False, False, True]`, hint: "is_strong should return True only when both rules are met: at least 8 characters AND at least one digit." },
      // A correct is_strong next to typed-in answers passed without this (fixture wrong/typed_prints).
      { expr: py`trace.count('is_strong') >= 2`, hint: "Test your function: call is_strong with \"hello\" and with \"secret42\", and print what it tells you." },
    ],
  },

  // ---------- Chapter 7: dictionaries ----------
  ch7_r1: {
    output: [{ expr: py`isinstance(ns.get('character'), dict) and len(L) == 4 and all(str(ns['character'][k]) in l and re.sub(re.escape(str(ns['character'][k])), '', l).strip() != '' for l, k in zip(L, ['name', 'class', 'level', 'health']))` }],
    probes: [
      { expr: py`set(ns.get('character', {})) >= {'name', 'class', 'level', 'health'} and all(isinstance(ns['character'][k], (int, float)) for k in ('level', 'health'))`, hint: "Your character dictionary needs the keys name, class, level and health, with numbers for level and health." },
      { expr: py`(lambda t: has('Zed', 'Bard', '99', '7', L=t))(rerun({'character': "{'name': 'Zed', 'class': 'Bard', 'level': 99, 'health': 7}"})[0])`, hint: "Print each value by looking it up with its key, like character[\"name\"], instead of typing it." },
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
  ch7_r3: {
    output: [{ expr: py`L[:4] == ['strength: 15', 'speed: 12', 'magic: 8', 'luck: 20'] and nums([55], L=L[4:])` }],
    concepts: [{ expr: py`calls('items') >= 1`, hint: "Loop over the dictionary with stats.items() to get each key and value together." }],
    probes: [
      { expr: py`(lambda t: t[:2] == ['a: 1', 'b: 2'] and nums([3], L=t[2:]))(rerun({'stats': "{'a': 1, 'b': 2}"})[0])`, hint: "Print the keys and values and add up the total straight from the stats dictionary, instead of typing them." },
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
  // A member's name and stats don't have to share a line (fixture ALT_multi_line).
  ch7_r5: {
    output: [
      { expr: py`has('Knight', '15', '12', 'Mage', '20', '5', 'Rogue', '12', '8', L=L[:-1])` },
      { expr: py`'Mage' in L[-1]` },
    ],
    probes: [
      // The re-run party has 3 members with the best last. The prototype's had Rogue at index 1, where
      // Mage is in the task's party, so a typed party[1] passed (fixture wrong/typed_index).
      { expr: py`'Rogue' in rerun({'party': "[{'name': 'Knight', 'attack': 1, 'defense': 1}, {'name': 'Mage', 'attack': 2, 'defense': 1}, {'name': 'Rogue', 'attack': 30, 'defense': 1}]"})[0][-1]`, hint: "Find the member with the highest attack by comparing their attack values, then print that member's name." },
    ],
  },
  ch7_s1: {
    output: [{ expr: py`lines(['Aria', 'unarmed', 'None'])` }],
    concepts: [{ expr: py`calls('get') >= 3`, hint: "Use hero.get() for all three lookups, as the task shows." }],
    probes: [
      { expr: py`rerun({'hero': "{'name': 'Zed', 'weapon': 'bow'}"})[0] == ['Zed', 'bow', 'None']`, hint: "Print what hero.get() gives back each time, instead of typing the answers." },
    ],
  },
  ch7_s2: {
    output: [{ expr: py`len(L) == 4 and all(any(re.search(r'\b%s\b\D*\b%d\b' % (ch, n), l) for l in L) for ch, n in [('m', 1), ('i', 4), ('s', 4), ('p', 2)])` }],
    probes: [
      { expr: py`{'m': 1, 'i': 4, 's': 4, 'p': 2} in globals_of(dict)`, hint: "Count the letters in a dictionary: add 1 to a letter's count each time you see it." },
      { expr: py`{'b': 1, 'a': 3, 'n': 2} in [v for k, v in rerun({'word': "'banana'"})[1].ns.items() if isinstance(v, dict) and not k.startswith('__')]`, hint: "Loop over the letters of word to build your counts, so it would work for any word." },
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
      { expr: py`(lambda t: all(s in '\n'.join(t) for s in ['Zed', 'Bard', '71', '72', '73', 'rope', 'lamp']))(call("display_character({'name': 'Zed', 'char_class': 'Bard', 'stats': {'strength': 71, 'speed': 72, 'magic': 73}, 'inventory': ['rope', 'lamp']})")[1])`, hint: "display_character should print every detail of the character it is given: use its parameter, not your own variable." },
    ],
  },
  grind_12: {
    output: [{ expr: py`len(L) == 5 and all(any(re.search(r'\b%s\b\D*\b%d\b' % (w, n), l) for l in L) for w, n in [('the', 3), ('cat', 2), ('sat', 1), ('on', 1), ('mat', 1)])` }],
    probes: [
      { expr: py`{'the': 3, 'cat': 2, 'sat': 1, 'on': 1, 'mat': 1} in globals_of(dict)`, hint: "Store the counts in a dictionary, with each word as a key and its count as the value." },
      { expr: py`{'a': 2, 'b': 1} in [v for k, v in rerun({'text': "'a b a'"})[1].ns.items() if isinstance(v, dict) and not k.startswith('__')]`, hint: "Split text into words and count them in a loop, so it would work for any text." },
    ],
  },
  grind_13: {
    output: [{ expr: py`len(globals_of(dict)) >= 1 and (lambda d: len(L) == len(d) and all(str(k) in out and str(v) in out for k, v in d.items()))(globals_of(dict)[0])` }],
    concepts: [
      { expr: py`any(isinstance(n, ast.Dict) and len(n.keys) == 3 for n in ast.walk(TREE))`, hint: "Start with a dictionary that has 3 contacts in it, each one a name: phone pair." },
      // The task only says "add one", so .update() and .setdefault() count too (fixture ALT_update).
      { expr: py`any(isinstance(n, ast.Assign) and isinstance(n.targets[0], ast.Subscript) for n in ast.walk(TREE)) or calls('update') >= 1 or calls('setdefault') >= 1`, hint: "Add one new contact to your dictionary, for example with your_dict[name] = phone." },
      { expr: py`count(ast.Delete) >= 1 or calls('pop') >= 1`, hint: "Delete one contact with del or .pop()." },
      { expr: py`calls('items') >= 1`, hint: "Print the contacts by looping over .items(), as the task asks." },
    ],
    probes: [
      { expr: py`any(len(d) == 3 for d in globals_of(dict))`, hint: "After adding one contact and deleting one, your dictionary should end up with 3 contacts." },
    ],
  },

  // ---------- Chapter 8: modules, strings, errors ----------
  // Changed from the prototype, which wanted each line to be the bare value:
  // - labels such as "You rolled a 4" pass (fixture ALT_labels): the roll is the line's last number, the
  //   line names one item, and the list is found inside its line;
  // - each probe patches in two values, not one: seed 0 rolls a 4, so a typed print(4) matched the one
  //   patched value (wrong/fixed_die), and one value is always matchable by typing it.
  ch8_r1: {
    output: [{ expr: py`len(L) >= 3 and 1 <= ints(L[0])[-1] <= 6 and sum(w in L[1] for w in ('sword', 'shield', 'potion')) == 1 and sorted(__import__('ast').literal_eval(re.search(r'\[.*\]', L[2]).group())) == [1, 2, 3, 4, 5]` }],
    probes: [
      { expr: py`all(ints(rerun(patches={'random.randint': lambda a, b, v=v: v})[0][0])[-1:] == [v] for v in (2, 5))`, hint: "Roll the die with random.randint(1, 6) and print what it gives you." },
      { expr: py`all(v in rerun(patches={'random.choice': lambda s, v=v: v})[0][1] for v in ('potion', 'sword'))`, hint: "Pick the item with random.choice() and print what it gives you." },
      { expr: py`all(s in rerun(patches={'random.shuffle': f})[0][2] for f, s in ((lambda x: x.reverse(), '[5, 4, 3, 2, 1]'), (lambda x: x.append(x.pop(0)), '[2, 3, 4, 5, 1]')))`, hint: "Shuffle your list with random.shuffle(), then print the list itself." },
    ],
  },
  ch8_r2: {
    output: [{ expr: py`has('6', 'the - quick - brown - fox - jumps - over', 'True')` }],
    probes: [
      { expr: py`has('3', 'hello - big - world', 'False', L=rerun({'sentence': "'  hello big world '"})[0])`, hint: "Get each answer from sentence with strip(), split(), len(), join() and startswith(), so they'd change for a different sentence." },
    ],
  },
  ch8_r3: {
    output: [{ expr: py`len(L) == 3 and all(l.strip() for l in L)` }],
    concepts: [
      { expr: py`count(ast.Try) >= 3`, hint: "Write three separate try/except blocks, one for each error." },
      { expr: py`{'ValueError', 'ZeroDivisionError', 'KeyError'} <= {h.type.id for h in ast.walk(TREE) if isinstance(h, ast.ExceptHandler) and isinstance(h.type, ast.Name)}`, hint: "Name the error in each except: ValueError, ZeroDivisionError and KeyError." },
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
      { expr: py`(lambda inv: (callf('add_item', inv, 'Zed', 42), callf('find_item', inv, 'Zed')[0] is inv[0] and callf('find_item', inv, 'nope')[0] is None)[1])([])`, hint: "find_item should return the matching item's dictionary, or None when nothing matches." },
      { expr: py`(lambda inv: (callf('add_item', inv, 'Zed', 42), callf('add_item', inv, 'Yan', 7), (lambda t: len(t) == 2 and 'Zed' in t[0] and '42' in t[0] and 'Yan' in t[1])(callf('display', inv)[1]))[2])([])`, hint: "display should print one line for each item in the list it is given." },
      { expr: py`trace.count('add_item') >= 3 and 'display' in trace and 'find_item' in trace`, hint: "Your program should call add_item 3 times, then display, then find_item." },
    ],
  },
  // Added a re-run probe: output checks alone passed the table typed out in five prints (fixture
  // wrong/hardcoded). The alignment check gets its own hint, because the default one says the output
  // doesn't match when only the spacing is off.
  ch8_s1: {
    output: [
      { expr: py`lines([r're:Item\s+Price', r're:-{5,}', r're:Sword\s+\$29\.99', r're:Shield\s+\$15\.50', r're:Potion\s+\$3\.00'])` },
      { expr: py`len({len(l) for l in L[2:]}) == 1`, hint: "So close! Line up the prices so they all end in the same column, like the table in the task." },
    ],
    probes: [
      { expr: py`(lambda t: len(t) == 3 and re.fullmatch(r'Axe\s+\$5\.50', t[2]) is not None)(rerun({'items': "[('Axe', 5.5)]"})[0])`, hint: "Print the rows by looping over the items list, so the table would change if the items did." },
    ],
  },
  // banana and cherry both have 6 letters, so either order is sorted by length. A kid who sorts words in
  // place first gets banana before cherry (fixture ALT_sort_in_place); the prototype only took cherry first.
  ch8_s2: {
    output: [{ expr: py`has("['apple', 'banana', 'cherry']", "['apple', 'cherry', 'banana']") or has("['apple', 'banana', 'cherry']", "['apple', 'banana', 'cherry']")` }],
    concepts: [{ expr: py`any(isinstance(n, ast.Call) and getattr(n.func, 'id', '') == 'sorted' and any(k.arg == 'key' and isinstance(k.value, ast.Lambda) for k in n.keywords) for n in ast.walk(TREE))`, hint: "For the length sort, use sorted() with key= and a lambda, as the task asks." }],
    probes: [
      { expr: py`getattr(ns.get('double'), '__name__', '') == '<lambda>' and val('double(7)') == 14`, hint: "Make double with lambda (not def), so that double(7) gives back 14." },
      { expr: py`any(re.search(r'-?\d', l) for l in L[:max(1, len(L) - 2)])`, hint: "Test your lambda: print what double gives back for a number, before the sorted lists." },
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
  //   ALT_count_in_check_guess), and globals_of() would see those calls.
  ch8_boss: {
    output: [{ expr: py`len([l for l in L if re.search(r'(?i)high|low|correct', l)]) >= 1` }],
    probes: [
      { expr: py`[val('check_guess(%d, 3)' % g) for g in (5, 1, 3)] == ['high', 'low', 'correct']`, hint: "check_guess should return \"high\", \"low\" or \"correct\" by comparing the guess with the secret." },
      { expr: py`[re.search(r'(?i)high|low|correct', l).group().lower() for l in rerun(patches={'random.randint': lambda a, b: 13})[0] if re.search(r'(?i)\b(high|low|correct)\b', l)][:4] == ['low', 'high', 'low', 'correct']`, hint: "Pick the secret with random.randint(1, 20), then check every guess against it with check_guess and print each result." },
      { expr: py`(lambda V, s7, s13: V(s7[0])[:3] == ['high', 'high', 'correct'] and (s7[1].trace.count('check_guess') < s13[1].trace.count('check_guess') or not {'high', 'low'} & set(V(s7[0])[3:])))(lambda t: [re.search(r'(?i)high|low|correct', l).group().lower() for l in t if re.search(r'(?i)\b(high|low|correct)\b', l)], rerun(patches={'random.randint': lambda a, b: 7}), rerun(patches={'random.randint': lambda a, b: 13}))`, hint: "Stop the game loop with break once a guess is correct." },
      { expr: py`any(isinstance(d, dict) and (4 in d.values() or len(d) == 4) for k, d in ns.items() if not k.startswith('__'))`, hint: "Keep track of the attempts in a dictionary, like stats = {\"attempts\": 0}." },
    ],
  },
  // len(L) >= 2, not == 2: a safe_divide that prints its own warning and returns None prints 3 lines
  // (fixture ALT_prints_message). The task doesn't say what to give back for b = 0, so returning 0 is
  // fine (fixture ALT_return_zero; the prototype wanted a message), and 10 / 3 can print rounded
  // (fixture ALT_rounded). The probes check the function itself.
  grind_14: {
    output: [{ expr: py`len(L) >= 2 and nums_approx([10/3], tol=0.05, L=L[:1])` }],
    concepts: [{ expr: py`count(ast.Try) >= 1`, hint: "Use try: and except: inside safe_divide to catch the divide-by-zero error." }],
    probes: [
      { expr: py`val('safe_divide(10, 4)') == 2.5`, hint: "safe_divide should return a / b when b isn't zero." },
      { expr: py`not (isinstance(val('safe_divide(1, 0)'), tuple) and val('safe_divide(1, 0)')[:1] == ('__error__',))`, hint: "Put the try/except inside safe_divide, so calling it with b = 0 never crashes." },
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
