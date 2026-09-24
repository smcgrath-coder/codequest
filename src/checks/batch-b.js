// Grading rules for chapters 5-8 and practice grind_8-15 (ported from rules_b.py). Format: see src/checks.js.
// py`...` is String.raw: each expr is the Python text exactly as written, backslashes and quotes included.
// The Python helpers below are spliced into exprs with ${...}; no expr uses ${ for anything else.
const py = String.raw;

// A list printed once, and its length printed as a number somewhere outside it: before it, after it or on
// its line (ch5_r5, grind_8). Only one line may hold a list, so printing inside the loop fails
// (fixtures wrong/adv_prints_in_loop).
const LIST_AND_LEN = py`(lambda t, lst, n: sum('[' in l for l in t) == 1 and has(lst, L=t) and nums([n], L=['\n'.join(t).replace(lst, ' ', 1)]))`;

// ch5_r5, grind_8: the items printed one per line, in order, as a loop over the list prints them (fixtures
// r3_each_word_line, r3_each_on_line): lines in a row (blank ones left out) that are each just an item, or
// an item after a bullet such as "- " or "1. ". The length n goes on the first line after them that holds a
// number, or, when none does, on the last line before them that does, as in "There are 4 long words:". So a
// heading with a number in it, such as "Words longer than 3 letters:", can't stand in for the length.
const ITEM_LINES = py`(lambda t, items, n: (lambda T: any([re.sub(r'^(?:\d+[.):]\s+|[-*•>]\s*)', '', l.strip()) for l in T[k:k + len(items)]] == [str(x) for x in items] and (lambda A, B: nums([n], L=A[:1]) if A else nums([n], L=B[-1:]))([l for l in T[k + len(items):] if re.search(r'\d', l)], [l for l in T[:k] if re.search(r'\d', l)]) for k in range(len(T) - len(items) + 1)))([l for l in t if l.strip()]))`;

// ch5_r5: LIST_AND_LEN, or the list's words joined on one line, as ", ".join(long_words) prints them
// (fixture r2_join_words), with the length outside them. Only one line may name the first word, so
// printing the joined words inside the loop fails (wrong/r2_joined_in_loop), as printing the list there does.
// Or the words one per line: see ITEM_LINES.
const WORDS_AND_LEN = py`(lambda t, items, n: ${LIST_AND_LEN}(t, str(items), n) or ${ITEM_LINES}(t, items, n) or (lambda pat: (lambda J: len(J) == 1 and sum(bool(re.search(r'(?<!\w)%s(?!\w)' % re.escape(items[0]), l)) for l in t) == 1 and nums([n], L=['\n'.join(t).replace(re.search(pat, J[0]).group(), ' ', 1)]))([l for l in t if re.search(pat, l)]))(r'(?<!\w)' + r'[\W_]+'.join(map(re.escape, items)) + r'(?!\w)'))`;

// A line with capitals, spaces and punctuation left out, for telling a near miss from a different line.
const LOOSE = py`(lambda s: re.sub(r'[\W_]+', '', s.lower()))`;

// The lines of t, blank ones left out, that match want in a row once LOOSE has been applied to both, or
// None: where want's lines are, near misses included (ch5_s2).
const RUN_OF = py`(lambda t, want: (lambda T, W: next((T[k:k + len(W)] for k in range(len(T) - len(W) + 1) if [${LOOSE}(l) for l in T[k:k + len(W)]] == W), None))([l for l in t if l.strip()], [${LOOSE}(w) for w in want]))`;

// The item lines as a block, then the total on the first line after it that holds a number (ch5_boss,
// ch7_r3). Blank lines are left out. Lines before the block, such as a title, are fine (fixtures
// adv_header), and so are lines after the total, such as a closing line (fixtures r1_closing_line). A
// total printed inside its loop puts a running total there first, so it fails (fixtures
// wrong/adv_total_in_loop and wrong/adv_total_in_second_loop). f is applied to each line and each block
// line before they are compared: with LOOSE, the check passes a near miss too, so that one can get its own hint.
// With anyorder=True the block's lines can come in any order, as a loop over sorted(stats.items()) prints
// them (ch7_r3, fixture r3_sorted_items).
const BLOCK_THEN_TOTAL = py`(lambda t, block, total, f=(lambda s: s), anyorder=False: (lambda T: any((lambda o: o([f(l) for l in T[k:k + len(block)]]) == o([f(b) for b in block]))(sorted if anyorder else list) and (lambda R: bool(R) and nums([total], L=R[:1]))([l for l in T[k + len(block):] if re.search(r'\d', l)]) for k in range(len(T))))([l for l in t if l.strip()]))`;

// True when a loop (a for or a comprehension) goes over a call to name, like enumerate(heroes) or
// stats.items(). A bare enumerate(heroes) statement before a range() loop doesn't count (ch5_s2, ch7_r3).
const LOOPS_OVER = py`(lambda name: any(isinstance(n, (ast.For, ast.comprehension)) and any(isinstance(c, ast.Call) and getattr(c.func, 'id', getattr(c.func, 'attr', None)) == name for c in ast.walk(n.iter)) for n in ast.walk(TREE)))`;

// The names an assignment target stores into: a and b in a, b = ..., d in d[k] = ... (not k, which is read).
const TARGET_NAMES = py`(lambda t: [m for m in ast.walk(t) if isinstance(m, ast.Name) and id(m) not in {id(x) for s in ast.walk(t) if isinstance(s, ast.Subscript) for x in ast.walk(s.slice)}])`;

// The names the program reads somewhere. Storing into a name isn't reading it, so the d in d[k] = ... and
// the list in a results.append(...) call (M holds the method names) don't count.
const READ_NAMES = py`(lambda M: (lambda tgt, mut: {n.id for n in ast.walk(TREE) if isinstance(n, ast.Name) and isinstance(n.ctx, ast.Load) and id(n) not in tgt and id(n) not in mut})({id(m) for s in ast.walk(TREE) if isinstance(s, (ast.Assign, ast.AugAssign, ast.AnnAssign)) for t in (s.targets if isinstance(s, ast.Assign) else [s.target]) for m in ${TARGET_NAMES}(t)}, {id(c.func.value) for c in ast.walk(TREE) if isinstance(c, ast.Call) and isinstance(c.func, ast.Attribute) and c.func.attr in M}))`;

// True when statement S throws away the answer of a call to f that isn't inside a print():
// - the call is the whole statement, as in is_strong("hello") on a line by itself;
// - S is results.append(f(...)) and the program never reads results;
// - S is some other expression on a line by itself, such as power_up("Knight") + "" or
//   [power_up(n) for n in names], whose value goes nowhere, and the call isn't handed on: to another call,
//   as in [show(power_up(n)) for n in names], to a comprehension's loop variable, or to a test that decides
//   something, as in print("strong") if is_strong(p) else print("weak") (fixture grind_11 r1_ternary_statement);
// - S stores it, as in a = f(0) or d[k] = f(k), and the program never reads a or d.
// Anything else hands the answer on (to print, an if, a return, another function), so it counts as used.
const THROWS_AWAY = py`(lambda S, f, read, M: (lambda C: bool(C) and (((isinstance(S.value, ast.Call) and getattr(S.value.func, 'id', '') == f) or (isinstance(S.value, ast.Call) and isinstance(S.value.func, ast.Attribute) and S.value.func.attr in M and isinstance(S.value.func.value, ast.Name) and S.value.func.value.id not in read) or (not isinstance(S.value, ast.Call) and (lambda used: any(id(c) not in used for c in C))({id(m) for p in ast.walk(S) for sub in ((p.args + [k.value for k in p.keywords]) if isinstance(p, ast.Call) else [p.test] if isinstance(p, ast.IfExp) else p.values if isinstance(p, ast.BoolOp) else [p.iter] + p.ifs if isinstance(p, ast.comprehension) else []) for m in ast.walk(sub)}))) if isinstance(S, ast.Expr) else not ({m.id for t in (S.targets if isinstance(S, ast.Assign) else [S.target]) for m in ${TARGET_NAMES}(t)} & read)))([c for c in ast.walk(S) if isinstance(c, ast.Call) and getattr(c.func, 'id', '') == f and id(c) not in {id(m) for p in ast.walk(S) if isinstance(p, ast.Call) and getattr(p.func, 'id', '') == 'print' for m in ast.walk(p)}]))`;

// True when the kid's function f, called with a, prints its own answer, so calling it on a line by itself
// shows that answer: power_up printing the message it returns (fixture ch6_r4 r1_prints_inside_and_returns),
// a converter printing the number it returns (fixture grind_10 prints_and_returns), is_strong printing
// "hello is weak" for the False it returns, or a function that returns nothing and only prints. A function
// whose print doesn't show its answer, such as a "Checking..." line, doesn't count
// (wrong/r1_debug_print_typed).
const SHOWS_OWN = py`(lambda f, *a: (lambda v, t: bool(t) and (v is None or (isinstance(v, str) and any(v in l for l in t)) or (isinstance(v, bool) and polarity(' '.join(t)) == (1 if v else -1)) or (type(v) in (int, float) and nums([v], L=t))))(*callf(f, *a)))`;

// False when the program throws away an answer of the kid's function f (see THROWS_AWAY), as in
// is_strong("hello") on a line by itself, or weak = is_strong("hello") that is never used, followed by a
// typed print("hello is weak") (fixtures wrong/adv_calls_then_typed, wrong/adv_stored_then_typed and
// wrong/adv_loop_stored_typed). A function that prints its own answer (SHOWS_OWN, for f(*a)) can be called
// that way. With loose=True, any function that prints something can: safe_divide printing a warning for
// b = 0 has shown the kid what happened, whatever it gives back (fixture grind_14 bare_call_prints).
// The engine can't re-run a program with a kid function replaced, which would show whether its answers
// reach the output, so this reads the program instead.
const USES_ANSWER = py`(lambda f, *a, M=('append', 'insert', 'extend', 'add'), loose=False: (lambda read: not any(${THROWS_AWAY}(S, f, read, M) for S in ast.walk(TREE) if isinstance(S, (ast.Expr, ast.Assign, ast.AugAssign, ast.AnnAssign))) or (bool(callf(f, *a)[1]) if loose else ${SHOWS_OWN}(f, *a)))(${READ_NAMES}(M)))`;

// True unless every call to f has a typed-in first argument and none of them is each of vals: a program
// that tests grind_10's converters with 100 and 32 instead of 0 and 212 fails (wrong/r1_other_test_values).
// A call whose argument is worked out, such as a loop's variable, can't be read, so then it passes.
const TESTED_WITH = py`(lambda f, vals: (lambda A: any(not isinstance(x, ast.Constant) for x in A) or all(any(x.value == v for x in A) for v in vals))([(c.args[:1] + [k.value for k in c.keywords])[0] for c in ast.walk(TREE) if isinstance(c, ast.Call) and getattr(c.func, 'id', '') == f and (c.args or c.keywords)]))`;

// The index of the last line that names exactly one of names as a word, or None: the answer line of a
// "find the best one" task, which a closing line after it doesn't hide (fixtures r1_closing_line). A line
// that names several, such as print(records), isn't one.
const ANSWER_AT = py`(lambda t, names: next((i for i in range(len(t) - 1, -1, -1) if sum(bool(re.search(r'\b%s\b' % re.escape(n), t[i])) for n in names) == 1), None))`;

// rerun()'s overrides for one variable: its first top-level assignment, and any later one that sets it
// to typed-in values again, as when a kid pastes the task's scores = [...] line under the starter's
// (fixture ch5_r3 adv_list_retyped). rerun() replaces only the first. A later books = sorted(books)
// computes the value, so it is left alone (fixture ch5_r2 ALT_other_tools).
const EVERY = py`(lambda name, src: {'%s#%d' % (name, i + 1): src for i, n in enumerate([n for n in TREE.body if isinstance(n, ast.Assign) and any(isinstance(t, ast.Name) and t.id == name for t in n.targets)]) if i == 0 or not any(isinstance(m, (ast.Name, ast.Call)) for m in ast.walk(n.value))})`;

// Marks that answer no or yes on their own: a cross (❌ ❎ ✖ ✗ ✘ 🚫 👎) or a check (✅ ✔ ✓ ☑ 👍).
const CROSS = py`[\u274C\u274E\u2716\u2717\u2718\U0001F6AB\U0001F44E]`;
const CHECK = py`[\u2705\u2714\u2713\u2611\U0001F44D]`;

// Yes/no answers, 1 or -1, in order. A line holding several True/False answers, as
// print(is_strong("hello"), is_strong("secret42")) prints, counts as several (ch5_s1, grind_11).
const YES_NO = py`(lambda t: [a for l in t for a in ([1 if w == 'True' else -1 for w in re.findall(r'\b(True|False)\b', l)] if len(re.findall(r'\b(True|False)\b', l)) > 1 else [polarity(l)]) if a])`;

// grind_11: YES_NO, but a line polarity() can't read is read with more words too: good, accepted, safe, ok
// or valid, or bad, rejected, unsafe, denied or invalid, and the check and cross marks (fixtures r3_good_bad,
// r3_accepted_rejected, r3_safe_not_safe, r3_emoji_verdicts). A line with a word of each kind, such as a
// heading "Testing good and bad passwords", is neither. The probes check that the answers come from is_strong.
const G11_POLARITY = py`(lambda l: polarity(l) or (lambda no, yes: -1 if no and not yes else 1 if yes and not no else 0)(re.search(r'(?i)\b(bad|rejected|unsafe|denied|invalid)\b|${CROSS}', l), re.search(r'(?i)\b(good|accepted|safe|ok|okay|valid|approved)\b|${CHECK}', l)))`;
const G11_YES_NO = py`(lambda t: [a for l in t for a in ([1 if w == 'True' else -1 for w in re.findall(r'\b(True|False)\b', l)] if len(re.findall(r'\b(True|False)\b', l)) > 1 else [${G11_POLARITY}(l)]) if a])`;

// ch5_r1: the three items in order and then the length, on lines in a row with blank lines left out. Lines
// before them, such as a title (fixture adv_header), and after them, such as a closing line (fixture
// r1_closing_line), are fine, and so is a blank line before the length (fixture r1_blank_before_len). The
// items can have a line each or share one (fixture adv_one_line_items), and the length can share their
// line too (fixture adv_one_line_all). The task doesn't say where the length goes, so it can come just
// before the items too, as in "I have 4 favorites:" (fixture r3_length_header_first). No item may be
// printed as a list, as favorites[:1] prints ['pizza'] (wrong/adv_slices_not_index).
const CH5_R1 = py`(lambda t, v, n: not any(re.search(r"\[\s*['\"]?%s['\"]?\s*\]" % re.escape(str(x)), l) for x in v for l in t) and (lambda T: any((k + 3 <= len(T) and all(str(x) in l for x, l in zip(v, T[k:k + 3])) and (nums([n], L=T[k + 3:k + 4]) or (k > 0 and nums([n], L=T[k - 1:k])))) or (has(*map(str, v), L=T[k:k + 1]) and (nums([n], L=T[k + 1:k + 2]) or (k > 0 and nums([n], L=T[k - 1:k])))) or (has(*map(str, v), L=T[k:k + 1]) and nums([n], L=[T[k].rsplit(str(v[-1]), 1)[-1]])) for k in range(len(T))))([l for l in t if l.strip()]))`;

// ch5_r3: whether the output grades the scores S in order, with 70 and up a Pass, on lines in a row
// (blank lines left out). Each of those lines holds its score and exactly one of Pass or Fail. Lines
// before and after them are free, so a title such as "Passing score is 70 or more" (fixture
// r1_pass_mark_header) or a summary such as "3 students passed!" (fixtures r1_count_passed_summary,
// adv_summary_line) is fine. A score printed on a line of its own, then its Pass or Fail on the next, counts
// as one line. Printing both a Pass and a Fail line for every score doesn't give a block in the right order.
// A line holding every score, as print(scores, "Pass") prints the whole list (wrong/r2_prints_scores_list),
// isn't a graded line.
const GRADED = py`(lambda t, S: (lambda T: any(len(T) >= k + len(S) and all(re.search(r'(?<![\d.])%d(?!\d|\.\d)' % s, l) and not all(re.search(r'(?<![\d.])%d(?!\d|\.\d)' % x, l) for x in S) and ('pass' in l.lower()) != ('fail' in l.lower()) and ('pass' in l.lower()) == (s >= 70) for l, s in zip(T[k:k + len(S)], S)) for k in range(len(T))))(__import__('functools').reduce(lambda a, l: a[:-1] + [a[-1] + ' ' + l] if a and re.search(r'\d', a[-1]) and not re.search(r'(?i)pass|fail', a[-1]) and re.search(r'(?i)pass|fail', l) and not re.search(r'\d', l) else a + [l], [l for l in t if l.strip()], [])))`;

// ch5_r4: the items printed, in the order they appear, must be the first 3, the last 2 and then the middle
// ([2:4] or [2:5]: "index 2 to 4" reads both ways, fixture ALT_inclusive_middle). Reading item names, not
// list reprs, lets a loop print each slice's items one per line (fixture adv_loop_each_item). With
// strict=True the middle must stop there, and the next item of the list may not follow it, so items[2:]
// fails (wrong/r2_middle_2_to_end). The re-run's list has 6 items, as the task's does, so items[2:-1] and
// items[-4:-1] are index 2 to 4 of both (fixtures r2_middle_neg_end, r3_negative_middle), and so are fixed
// positions such as items[4:6] for the last 2 (fixture m_cu1_fixed_positions). Typed items still fail the
// re-run, whose items are animals.
const CH5_R4 = py`(lambda t, v, strict=False: (lambda W: any(' %s ' % ' '.join(v[:3] + v[-2:] + mid) in W and not (strict and ' %s ' % ' '.join(v[:3] + v[-2:] + v[2:len(mid) + 3]) in W) for mid in [v[2:k] for k in (4, 5)]))(' %s ' % ' '.join(w for w in re.findall(r'\w+', '\n'.join(t)) if w in v)) and nums([len(v)], L=t))`;

// ch7_r1: 4 lines in a row, each holding one of the values and a label. Lines before and after them are
// free, so a title line (fixture adv_header) or a closing line (fixture r1_closing_line) is fine. The task
// doesn't set an order (fixture adv_other_order), so any line may hold any value. The labelled values can
// share a line too, split by commas, bars, semicolons or tabs (fixture r1_one_line_labels), but not inside a
// printed dict: print("Character:", character) shows every value, but not looked up by key, and its
// 'level': 5 would pass for a label (wrong/r1_dict_line_with_label). Whole lines are tried first, so a value
// with a comma in it, like "Aria, the Wise", is fine (fixture r1_name_with_comma). A label printed on a line
// of its own, ending in a colon, can have its value on the next line, as print("Name:") and then
// print(character["name"]) print them (fixture r3_label_line_then_value): the two lines are read as one.
const CH7_R1 = py`(lambda t, c: (lambda fits: fits(t) or fits([s for l in t if '{' not in l for s in re.split(r'\s*[,;|\t]\s*', l) if s.strip()]) or fits(re.sub(r':[ \t]*\n', ': ', '\n'.join(l for l in t if l.strip())).split('\n')))(lambda t: any(all(str(c[k]) in l and re.sub(re.escape(str(c[k])), '', l).strip() != '' for l, k in zip(t[i:i + 4], p)) for i in range(len(t) - 3) for p in __import__('itertools').permutations(['name', 'class', 'level', 'health']))))`;

// ch7_s2, grind_12: one line per counted thing, each naming it and then its count. A counted thing's line
// is one that names it with a number after it, so a title line is fine, even with a number in it, such as
// "mississippi has 11 letters:" or "There are 8 words in the text." (fixtures adv_header,
// r2_header_with_number), and so is a line after them, such as "Total words: 8" (fixture r2_total_line).
// Each counted thing needs exactly one such line, so printing the counts as they grow, inside the counting
// loop (wrong/r2_running_counts), or once for every letter of the word, fails. The lines can share one line
// of output (fixture r2_one_line). Things are matched with their capitals, or in any capitals when no line
// matches that way, so "M: 1" is fine (fixture r2_upper_letters). Or the counts dict printed as it is, as
// print(counts) prints it, with nothing else in its braces (fixtures r1_print_dict), or its items() as
// (thing, count) pairs, as print(counts.items()) prints them (fixture r2_items_print): that shows each one
// and its count too. A line where the number after the thing counts words or letters, as in the heading
// "Counting the 8 words:", isn't that thing's line (fixture grind_12 r3_header_the_8_words).
const COUNT_LINES = py`(lambda t, pairs: all((lambda K: len(K) == 1 and re.search(r'(?i)\b%s\b\D*\b%d\b' % (re.escape(w), n), K[0]) is not None)((lambda t: [l for l in t if re.search(r'\b%s\b\D*\d' % re.escape(w), l)] or [l for l in t if re.search(r'(?i)\b%s\b\D*\d' % re.escape(w), l)])([l for l in t if not re.search(r'(?i)\b%s\b\D*\d+\s*(?:words?|letters?|characters?|chars?)\b' % re.escape(w), l)])) for w, n in pairs) or any(m and m.group(1).count(':') == len(pairs) and sorted(re.findall(r"['\"]([^'\"]*)['\"]\s*:\s*(\d+)", m.group(1))) == sorted((w, str(n)) for w, n in pairs) for m in (re.search(r'\{(.*)\}', l) for l in t)) or any(sorted(re.findall(r"\(\s*['\"]([^'\"]*)['\"]\s*,\s*(\d+)\s*\)", l)) == sorted((w, str(n)) for w, n in pairs) for l in t))`;

// ch8_boss: a line's result, 'high', 'low' or 'correct', or None. "You got it!" counts as correct, so a
// game that turns check_guess's answers into its own messages works (fixture adv_friendly_messages). A line
// that names more than one result isn't a result, such as an intro line "I'll tell you if each guess is too
// high or too low!" (fixture r2_intro_mentions_high_low) or a summary such as "too high: 1, too low: 2".
// "Too big" and "too large" count as high, and "too small" and "too little" as low (fixture
// r3_big_small_messages).
const RESULT_OF = py`(lambda l: (lambda R: R.pop() if len(R) == 1 else None)({'high' if re.fullmatch(r'(?i)high|too\s+(?:big|large)', m) else 'low' if re.fullmatch(r'(?i)low|too\s+(?:small|little)', m) else 'correct' for m in re.findall(r'(?i)\b(high|low|correct|got it|you win|you won|too\s+(?:big|large|small|little))\b', l)}))`;
// ch8_boss: the results in the printed lines, in order.
const RESULTS = py`(lambda t: [r for r in map(${RESULT_OF}, t) if r])`;
// ch8_boss: True when the attempts count n shows after the line of the correct guess, or on it as a count,
// as in "Correct! You took 4 attempts." (fixture r2_count_on_correct_line) or "attempts: 4". A guess's
// number, as in "Guess 4: 13 is correct", isn't stats (wrong/r2_intro_correct_no_stats). The correct
// guess's line is the first that reads as correct after one that reads as high or low, so an intro such as
// "Guess correctly to win!" isn't it. Both re-runs that use this have a wrong guess before the right one.
const STATS_SHOWN = py`(lambda t, n: (lambda R: (lambda i: i is not None and (re.search(r'(?<![\d.])%d(?![\d.])' % n, '\n'.join(t[i + 1:])) is not None or re.search(r'(?i)(?<![\d.])%d\s+(attempts?|tries|try|guesses|turns|goes|rounds)\b|\b(attempts?|tries|guesses|turns)\s*[:=]\s*%d(?![\d.])' % (n, n), t[i]) is not None))(next((i for i in range(len(t)) if R[i] == 'correct' and {'high', 'low'} & set(R[:i])), None)))([${RESULT_OF}(l) for l in t]))`;
// ch8_boss: rerun()'s overrides for 3 guesses with the right one, 13, last: low, high, correct. A loop that
// stops at the correct guess and one that checks every guess both take 3 attempts there. No guess is a 3,
// so printing the guesses, as print(stats["guesses"]) does, doesn't show a 3 for the attempts.
const CH8_BOSS_LAST_RIGHT = py`${EVERY}('guesses', '[2, 19, 13]')`;

// ch5_s1: the yes/no answers, 1 or -1, in order.
// - When exactly 4 lines name one searched book each, each answer is its named line plus the lines after
//   it, up to the next named line (so print(book) then print(book in library) works: fixture
//   ALT_name_then_bool). The last answer gets as many lines as the first, so a heading or a closing line is
//   left out. A line naming several books, such as a "Library: [...]" line or a heading that lists the four
//   searches, isn't a named line (fixtures r1_library_line_exists, r1_heading_have_it). An answer is no if
//   it says so, and yes otherwise: the engine's polarity() gives 0 for "Python exists" or "we have it", and
//   its n't can't match inside "don't" (fixtures ALT_exists, ALT_have_it, r1_absent). Any cross mark, such
//   as ✘, is a no too (fixture r3_check_cross).
// - Otherwise, as for print("Python" in library), the answers are the lines polarity() reads as yes or no
//   (fixture ALT_bools), and a line of several True/False answers counts as several (fixture
//   adv_one_line_bools): see YES_NO.
const CH5_S1_NO = py`r"(?i)\b(no|not|nope|false|missing|unavailable|absent|gone|nowhere|isnt|doesnt|dont|wasnt)\b|n['’]t\b|${CROSS}"`;
const CH5_S1_ANSWERS = py`(lambda t: (lambda idx: [-1 if re.search(${CH5_S1_NO}, ' '.join(t[i:j])) else 1 for i, j in zip(idx, idx[1:] + [idx[-1] + idx[1] - idx[0]])] if len(idx) == 4 else ${YES_NO}(t))([i for i, l in enumerate(t) if len(set(re.findall(r'\b(Python|Ruby|Games|Math)\b', l))) == 1]))`;

// ch5_s1: the answers when a line can name several books, as print("Found:", found) and
// print("Missing:", missing) do (fixture r2_found_missing_lists). Each line naming a book reads as no if it
// says so and as yes otherwise, and the book's answer is what its lines agree on, or none if they don't. A
// line naming all four, such as a heading, is left out. A "Library: [...]" line names only books that are
// there, so it reads as yes for them. Typed lists fail the re-run (wrong/r2_typed_found_missing).
const CH5_S1_GROUPED = py`(lambda t: (lambda B: [(lambda P: P[0] if len(set(P)) == 1 else 0)([-1 if re.search(${CH5_S1_NO}, l) else 1 for l in B if re.search(r'\b%s\b' % b, l)] or [0]) for b in ('Python', 'Ruby', 'Games', 'Math')])([l for l in t if 1 <= len(set(re.findall(r'\b(Python|Ruby|Games|Math)\b', l))) <= 3]))`;

// grind_15: the numbers on the summary line, leaving out a total or a share such as "out of 10", "2/10",
// "(20%)", "in 10 rolls" or "10 rolls", so the count is what's left (fixtures adv_out_of_10, adv_percent_line).
const DOUBLES = py`(lambda l: ints(re.sub(r'(?i)\bout of\s*\d+|/\s*\d+|\d+\s*%|\bin\s+\d+\b|\b\d+\s+(?:rolls|throws|tries|turns)\b', ' ', l)))`;

// grind_9: True when a list comprehension builds a list by picking items by index, as
// [original[i] for i in range(len(original) - 1, -1, -1)] does, so the comprehension's loop does the reversing.
const REVERSING_COMP = py`any(isinstance(n, ast.ListComp) and any(isinstance(m, ast.Subscript) and not isinstance(m.slice, ast.Slice) for m in ast.walk(n.elt)) for n in ast.walk(TREE))`;

// grind_13: True when a dict() call before the first del or pop makes a dict of 3 contacts, as
// dict(Luna="111-2222", Max="333-4444", Kai="555-6666") or dict(zip(names, phones)) do. The call is worked out
// again with the program's final variables. A copy of a dict, as in dict(contacts), isn't one.
const G13_DICT_CALL = py`(lambda cut: any(isinstance(n, ast.Call) and getattr(n.func, 'id', '') == 'dict' and n.lineno < cut and not (len(n.args) == 1 and isinstance(n.args[0], ast.Name)) and (lambda v: isinstance(v, dict) and len(v) == 3)(val(ast.unparse(n))) for n in ast.walk(TREE)))(min([n.lineno for n in ast.walk(TREE) if isinstance(n, ast.Delete) or (isinstance(n, ast.Call) and getattr(n.func, 'attr', None) == 'pop')] or [10 ** 9]))`;

// ch8_s1: the lines from the table's Item header on (in any capitals, so a near miss such as "item price"
// is still the header), or all of them when no line starts with Item; and the table, the first 5 of them.
const CH8_S1_FROM = py`(lambda t: t[next((i for i, l in enumerate(t) if re.match(r'(?i)\s*item\b', l)), 0):])`;
const CH8_S1_TABLE = py`(lambda t: ${CH8_S1_FROM}(t)[:5])`;

// True when want comes in a row somewhere in the list got (ch8_s3).
const IN_A_ROW = py`(lambda got, want: any(got[k:k + len(want)] == want for k in range(len(got) - len(want) + 1)))`;

// ch8_r2: a line's yes or no, 1 or -1, as polarity() reads it, or 0. A line polarity() can't read that
// says it starts or begins with something is a yes, as in "It starts with 'the'!", unless it says doesn't
// or not, as in "It doesn't start with 'the'." (polarity()'s n't doesn't match inside doesn't). On such a
// line a cross or a check mark answers first, so "Starts with 'the'? ❌" is a no (fixture r3_emoji_answer),
// and so does a line that is only a cross or a check. A mark on another line, as in "All done ✅", isn't an
// answer.
const STARTS = py`(lambda l: polarity(l) or ((-1 if re.search(r'${CROSS}', l) else 1 if re.search(r'${CHECK}', l) else -1 if re.search(r"(?i)n['’]t\b|\b(doesnt|dont|not|no)\b", l) else 1) if re.search(r'(?i)\b(starts?|begins?|startswith)\b', l) else -1 if re.fullmatch(r'\W*${CROSS}\W*', l) else 1 if re.fullmatch(r'\W*${CHECK}\W*', l) else 0))`;

// ch8_r1: (roll, item line, list), in the task's order, or None for a missing one. The item line is the
// first that names exactly one of the items. The roll is the last line before it with a number and no
// list, and the list the last line after it that holds one. So a title line can come first (fixture
// adv_header), and the list can be printed before it is shuffled too (fixture adv_before_after_shuffle).
// The task doesn't say how to lay out the lines, so the results can share lines too, as in
// print(f"Dice: {die} | Item: {item} | Shuffled: {deck}") (fixtures m_cu1_one_line, r4_roll_and_item_line):
// the item line's text before the item counts toward the roll when it has a number and no list, and its
// text after the item is the list when no later line holds one.
const CH8_R1 = py`(lambda t: (lambda j: (None, None, None) if j is None else (lambda p, q: (' '.join(x for x in (next((l for l in reversed(t[:j]) if re.search(r'\d', l) and '[' not in l), None), t[j][:p] if re.search(r'\d', t[j][:p]) and '[' not in t[j][:p] else None) if x) or None, t[j], next((l for l in reversed(t[j + 1:]) if re.search(r'\[.*\]', l)), None) or (t[j][q:] if re.search(r'\[.*\]', t[j][q:]) else None)))(*(lambda w: (t[j].find(w), t[j].find(w) + len(w)))(next(w for w in ('sword', 'shield', 'potion') if w in t[j]))))(next((i for i, l in enumerate(t) if sum(w in l for w in ('sword', 'shield', 'potion')) == 1), None)))`;

// grind_15: the numbers on a line, leaving out labels such as "Die 1:" or "2nd die", a sum such as "= 8" or
// "total 8" (fixture adv_with_sum), and counts such as "2 dice" or "10 times" (fixtures r1_header_comma,
// r1_header_no_comma). "Die 1" or "dice 2" is a label only when a colon, =, -> or a word such as "shows"
// comes next: in print("Dice", a, b), "Roll 1: dice 1 5", "Rolled dice 1 and 5" or "die 1, die 2" the
// numbers are the dice (fixtures r1_dice_word_*). Labels go first, so the = of "Die 1 = 3" isn't read as a
// sum. Dice are never negative, so "3-5" is two dice. A running count after "so far", "count" or "tally",
// as in "Roll 3: 2 5 (doubles so far: 1)", isn't a die either (fixture r2_running_tally).
const DICE = py`(lambda l: [int(x) for x in re.findall(r'\d+', re.sub(r'(?i)\b\d+(?:st|nd|rd|th)\b|(?<=\d)\s*=\s*\d+|\b(?:total|sum|so far|count|tally)\b\W*\d+|\b\d+\s*(?:dice|die|times|rolls?|throws?|tries|turns?|sides?|-sided)\b', ' ', re.sub(r'(?i)\b(?:die|dice)\s*#?[12]\b(?=\s*(?::|=|->|is\b|was\b|shows?\b|rolled\b|got\b|landed\b))', ' # ', l)))])`;

// grind_15: a re-run where every way of rolling a die gives f's values in turn: the task only says to
// simulate rolling dice, so random.randint(1, 6), random.randrange(1, 7) and random.choice([1, 2, 3, 4, 5, 6])
// or choice(range(1, 7)) all roll them (fixtures r3_choice_dice, r3_choice_range, r3_randrange_dice).
const DICE_RERUN = py`(lambda f: rerun(patches={'random.randint': f, 'random.randrange': f, 'random.choice': f}))`;

// grind_15: (summary line, roll lines). The summary is the last line holding a number once DOUBLES has
// dropped its totals, so a closing line after it is fine (fixture r1_closing_line); the rolls are the lines
// before it with 2 or more dice.
const ROLLS = py`(lambda t: (lambda s: (None, []) if s is None else (t[s], [l for l in t[:s] if len(${DICE}(l)) >= 2]))(next((i for i in range(len(t) - 1, -1, -1) if ${DOUBLES}(t[i])), None)))`;

// ch6_r2: the lines holding the word Level (in any capitals, and "Level5" too), which the status lines do:
// a title or a closing line without it, or with only "levels", "leveled" or "level up", as in "Time to
// level up!" (fixture r3_level_up_closing), is left out.
const HERO_LINES = py`(lambda t: [l for l in t if re.search(r'(?i)\blevel(?![a-z])(?!\W*up\b)', l)])`;

// ch6_r3: when a result of calculate_damage is stored inside a loop or a function, as in
// for base in [10, 20]: damage = calculate_damage(base, 2), whether every print() whose text says "dealt"
// prints one of the variables that hold such a result. A typed print("Damage dealt: 30") next to it doesn't.
const CH6_R3_NESTED = py`(lambda top, A: any(id(n) not in top for n in A) and (lambda S, P: bool(P) and all(any(isinstance(m, ast.Name) and isinstance(m.ctx, ast.Load) and m.id in S for m in ast.walk(c)) for c in P))({t.id for n in A for t in n.targets if isinstance(t, ast.Name)}, [c for c in ast.walk(TREE) if isinstance(c, ast.Call) and getattr(c.func, 'id', '') == 'print' and any(isinstance(m, ast.Constant) and isinstance(m.value, str) and 'dealt' in m.value.lower() for m in ast.walk(c))]))({id(n) for n in TREE.body}, [n for n in ast.walk(TREE) if isinstance(n, ast.Assign) and any(isinstance(c, ast.Call) and getattr(c.func, 'id', '') == 'calculate_damage' for c in ast.walk(n.value))])`;

// ch7_s1: the first 3 lines in a row of t that match pats, as lines() matches them, or None. Lines before
// them, such as a heading (fixture r1_header), and after them, such as a closing line (fixture
// r3_closing_line), are fine.
const RUN3 = py`(lambda t, pats: next((t[k:k + 3] for k in range(len(t) - 2) if lines(pats, L=t[k:k + 3])), None))`;
// ch7_s1: the lookups' lines, each ending in its answer, with a label before it or not (fixture adv_labels).
const CH7_S1_PATS = py`[r're:(?:.*\W)?Aria', r're:(?:.*\W)?unarmed', r're:(?:.*\W)?None']`;
// ch7_s1: the answers w as 3 pieces of output, each ending in its answer, or None: 3 lines in a row that
// each end in theirs (RUN3), or else 1 to 3 lines in a row, read as one, that hold all three in order, cut
// just after each, as print(f"{name} is {weapon} and has shield = {shield}") prints them (fixtures
// m_cu1_one_sentence, r4_two_lines_sentence). With flags=re.I, in any capitals, so a near miss such as
// "Unarmed" can get a hint that names its piece. Only text of up to 300 characters is read as one.
const ANSWERS3 = py`(lambda t, w, flags=0: ${RUN3}(t, [r're:%s(?:.*\W)?%s' % ('(?i)' if flags else '', re.escape(x)) for x in w]) or next(([m.group(1), m.group(2), m.group(3)] for k in range(len(t)) for n in (1, 2, 3) if k + n <= len(t) and len(' '.join(t[k:k + n])) <= 300 and all(x.lower() in ' '.join(t[k:k + n]).lower() for x in w) for m in [re.fullmatch(r'((?:.*\W)?%s)(?!\w)((?:.*\W)?%s)(?!\w)((?:.*\W)?%s)(?:\W.*)?' % tuple(map(re.escape, w)), ' '.join(t[k:k + n]), flags)] if m), None))`;
const CH7_S1_WORDS = py`['Aria', 'unarmed', 'None']`;
// ch7_s1: the hero.get() calls whose key isn't one of hero's or the task's, such as "Name" or "sheild".
const CH7_S1_BAD_KEYS = py`[c for c in ast.walk(TREE) if isinstance(c, ast.Call) and isinstance(c.func, ast.Attribute) and c.func.attr == 'get' and c.args and isinstance(c.args[0], ast.Constant) and isinstance(c.args[0].value, str) and c.args[0].value not in ('name', 'weapon', 'shield', 'level')]`;
// ch7_s1: whether a re-run with a hero that has a weapon and a shield prints them, in the task's order.
const CH7_S1_RERUN = py`(${ANSWERS3}(rerun(${EVERY}('hero', "{'name': 'Zed', 'weapon': 'bow', 'shield': 'oak'}"))[0], ['Zed', 'bow', 'oak']) is not None)`;

// ch7_s3: whether the output shows the dict d one entry per line: len(d) lines in a row (blank lines left
// out), with no braces, where each entry's key and value are on exactly one line and each line holds an
// entry, in any order. So "1 cubed is 1" and "elephant has 8 letters" are entries, and a heading such as
// "Cubes:" can come before them. A dict built from range(1, 5) misses the line for 5.
const ENTRY_LINES = py`(lambda t, d: (lambda T, hit: any(all(sum(hit(l, k, v) for l in T[i:i + len(d)]) == 1 for k, v in d.items()) and all(any(hit(l, k, v) for k, v in d.items()) for l in T[i:i + len(d)]) for i in range(len(T) - len(d) + 1)))([l for l in t if l.strip()], lambda l, k, v: '{' not in l and all(re.search(r'(?<![\w.])%s(?![\w.])' % re.escape(str(x)), l) for x in (k, v))))`;

// ch7_r2: whether the output shows the dict d. Either a line holds it in braces, as print(player) prints it,
// with exactly its entries in any order (compared as text, so a line holding something else in braces
// can't raise, as ast.literal_eval would, which fails the whole check), or each key is on a line with its
// value, as a loop over player.items() prints them (fixture r1_loop_print): that shows the final dict too.
const SHOWS_DICT = py`(lambda t, d: any(m and sorted(re.sub(r'\s*:\s*', ': ', p.strip()) for p in m.group(1).replace('"', "'").split(',')) == sorted('%r: %r' % kv for kv in d.items()) for m in (re.search(r'\{(.*)\}', l) for l in t)) or all(any(re.search(r'\b%s\b' % re.escape(str(k)), l) and re.search(r'(?<![\w.])%s(?![\w.])' % re.escape(str(v)), l) for l in t) for k, v in d.items()))`;

// ch8_r1: patches that make every way of rolling a die give its v-th smallest value: randint(a, b) gives
// a + v - 1, randrange its v-th value, and choice() over 6 whole numbers its v-th one, so randint(1, 6),
// randint(0, 5) + 1, randrange(1, 7) and choice([1, 2, 3, 4, 5, 6]) all roll a v. choice() over anything
// else, such as the items, gives the first one. random() gives a number that int(random() * 6) + 1 turns
// into v, while round(random() * 6, 2) doesn't give a whole number (wrong/r1_float_roll).
const DIE_PATCH = py`(lambda v: {'random.randint': lambda a, b, v=v: a + v - 1, 'random.randrange': lambda a, b=None, step=1, v=v: (0 if b is None else a) + (v - 1) * step, 'random.choice': lambda s, v=v: s[v - 1] if len(s) == 6 and all(type(x) is int for x in s) else s[0], 'random.random': lambda v=v: (v - 0.5) / 6})`;

export const BATCH_B = {
  // ---------- Chapter 5: lists ----------
  // Changed from the prototype: each line only has to contain its value, so labels such as "First: pizza"
  // pass (fixture ALT_labels), and the three items can share a line (CH5_R1). The re-run list has 5 items
  // with distinct names, so a typed print(4) for the length fails (wrong/typed_length) and a label can't
  // match an item by accident. None of its items has 5 letters, so len(favorites[0]) can't give the length
  // by chance (wrong/r2_len_of_first_item).
  // content bug: the room's second hint, print(favorites[0]), print(favorites[-1]), print(len(favorites)),
  // leaves out favorites[1]. The first output check spots a kid who followed it and says what's missing.
  ch5_r1: {
    output: [
      { expr: py`not (isinstance(ns.get('favorites'), list) and len(ns['favorites']) >= 2 and (lambda f: len(L) >= 3 and str(f[0]) in L[-3] and str(f[-1]) in L[-2] and nums([len(f)], L=L[-1:]) and not any(str(f[1]) in l for l in L))(ns['favorites']))`, hint: "Almost! The task asks for the second item too: print favorites[1] after the last item, then the length." },
      // favorites[:1] prints ['pizza'] (wrong/adv_slices_not_index): CH5_R1 fails that too, but this says why.
      { expr: py`not (isinstance(ns.get('favorites'), list) and any(re.search(r"\[\s*['\"]?%s['\"]?\s*\]" % re.escape(str(x)), l) for x in ns['favorites'] for l in L))`, hint: "Print one item by its index, like favorites[0], not with a slice like favorites[:1]: a slice gives back a whole list." },
      { expr: py`isinstance(ns.get('favorites'), list) and (lambda f: ${CH5_R1}(L, [f[0], f[-1], f[1]], len(f)))(ns['favorites'])`, hint: "Remember that Python counts from 0: print the first item, then the last, then the second, each by its index, and then how many items there are." },
    ],
    probes: [
      { expr: py`isinstance(ns.get('favorites'), list) and len(ns['favorites']) == 4`, hint: "Your favorites list should have exactly 4 things in it." },
      // The re-run's output is compared with the re-run's own final list, so a list built with append() or +=
      // after its first line is judged by what it ends up holding (fixtures r3_built_with_append,
      // r3_plus_equals_build). favorites[3] is the last of 4 items, but not of 5 or more
      // (wrong/r1_index3_for_last): say so.
      { expr: py`(lambda t, r: (lambda f: not (isinstance(f, list) and len(f) >= 5 and ${CH5_R1}(t, [f[0], f[3], f[1]], len(f))))(r.ns.get('favorites')))(*rerun(${EVERY}('favorites', "['Zeppelin', 'Yoyo', 'Wren', 'Vole', 'Quux']")))`, hint: "For the last item, use favorites[-1]: it gives the last item however long the list is." },
      { expr: py`(lambda t, r: (lambda f: isinstance(f, list) and len(f) >= 5 and 'Zeppelin' in f and ${CH5_R1}(t, [f[0], f[-1], f[1]], len(f)))(r.ns.get('favorites')))(*rerun(${EVERY}('favorites', "['Zeppelin', 'Yoyo', 'Wren', 'Vole', 'Quux']")))`, hint: "Print the items by their index, like favorites[0], and the count with len(), so it would work for any list." },
    ],
  },
  // The final sort hides where Alpha went, so only the program shows whether step 2 put it at the front
  // (wrong/adv_skips_insert appends it). ["Alpha"] + books and books[:0] = ["Alpha"] insert at 0 too.
  // For the same reason, inserting "Alpha" at a typed position other than 0, such as books.insert(1, "Alpha"),
  // fails (wrong/r1_insert_at_1, wrong/r1_insert_at_end_index). A position worked out in the program can't
  // be read, so it is left alone, and so is an insert of some other typed item, such as a
  // books.insert(3, "Beta") that appends. A negative position, as in books.insert(-1, "Alpha"), isn't 0
  // either (wrong/r2_insert_at_minus1), and "Alpha" appended or added to the end, as in steps 1 and 2 done
  // the other way round, fails too (wrong/r2_swapped_append_insert).
  // print(sorted(books)) prints the right list, but books itself is never sorted, which step 4 asks for:
  // the probe's hint says so (wrong/r2_print_sorted_copy).
  ch5_r2: {
    output: [{ expr: py`has("['Alpha', 'Arch', 'Beta', 'Code']") or has('Alpha', 'Arch', 'Beta', 'Code')`, hint: "Do all four steps to books in the task's order, from appending \"Beta\" to sorting, and then print the final list." }],
    concepts: [
      { expr: py`calls('insert') >= 1 or any((isinstance(n, ast.BinOp) and isinstance(n.op, ast.Add) and isinstance(n.left, ast.List)) or (isinstance(n, ast.Assign) and any(isinstance(t, ast.Subscript) and isinstance(t.slice, ast.Slice) for t in n.targets)) for n in ast.walk(TREE))`, hint: "Step 2 says to put \"Alpha\" at position 0, the front of the list. .insert() can put an item at any position." },
      { expr: py`not any(isinstance(n, ast.Call) and isinstance(n.func, ast.Attribute) and n.func.attr == 'insert' and len(n.args) == 2 and (lambda p: type(p) is int and p != 0)(n.args[0].value if isinstance(n.args[0], ast.Constant) else -n.args[0].operand.value if isinstance(n.args[0], ast.UnaryOp) and isinstance(n.args[0].op, ast.USub) and isinstance(n.args[0].operand, ast.Constant) and type(n.args[0].operand.value) is int else None) and not (isinstance(n.args[1], ast.Constant) and n.args[1].value != 'Alpha') for n in ast.walk(TREE))`, hint: "Step 2 says to insert \"Alpha\" at position 0, the very front: the first number you give .insert() is the position." },
      // .append("Alpha"), .extend(["Alpha"]), books += ["Alpha"] and books + ["Alpha"] all put it at the end.
      { expr: py`not any((isinstance(n, ast.Call) and isinstance(n.func, ast.Attribute) and ((n.func.attr == 'append' and any(isinstance(a, ast.Constant) and a.value == 'Alpha' for a in n.args)) or (n.func.attr == 'extend' and any(isinstance(a, (ast.List, ast.Tuple)) and any(isinstance(e, ast.Constant) and e.value == 'Alpha' for e in a.elts) for a in n.args)))) or (isinstance(n, ast.AugAssign) and isinstance(n.op, ast.Add) and isinstance(n.value, (ast.List, ast.Tuple)) and any(isinstance(e, ast.Constant) and e.value == 'Alpha' for e in n.value.elts)) or (isinstance(n, ast.BinOp) and isinstance(n.op, ast.Add) and not isinstance(n.left, ast.List) and isinstance(n.right, ast.List) and any(isinstance(e, ast.Constant) and e.value == 'Alpha' for e in n.right.elts)) for n in ast.walk(TREE))`, hint: "Do the steps in the task's order: append \"Beta\" to the end, then insert \"Alpha\" at position 0, the front of the list." },
    ],
    probes: [
      { expr: py`ns.get('books') == ['Alpha', 'Arch', 'Beta', 'Code']`, hint: "Change the books list itself with list methods like .append() and .sort(), then print books." },
      { expr: py`rerun(${EVERY}('books', "['Zed', 'Dragon']"))[1].ns.get('books') == ['Alpha', 'Beta', 'Zed']`, hint: "Do each step with a list method on books, so the steps would still work if the shelf started with different books." },
    ],
  },
  // content bug: the room's second hint puts if score >= 70: print(...) else: print(...) on one line, which
  // is a SyntaxError if a kid copies it.
  // Changed from exactly 6 lines: the score lines are a block of lines in a row, so a title line (fixture
  // adv_header) and a summary (fixture adv_summary_line) are fine: see GRADED. The re-run's first score is a
  // Fail and the next two are Passes, so a typed Pass/Fail list fails (wrong/adv_typed_results_zip), and 70
  // still has to count as a Pass.
  ch5_r3: {
    output: [{ expr: py`${GRADED}(L, [85, 42, 91, 67, 73, 55])`, hint: "Print each score on a line with its result, Pass if it's 70 or more and Fail if it's less, in the list's order." }],
    probes: [
      { expr: py`${GRADED}(rerun(${EVERY}('scores', '[69, 70, 90]'))[0], [69, 70, 90])`, hint: "Loop through the scores list and decide with an if, so a score of exactly 70 counts as a Pass." },
    ],
  },
  // Changed from the prototype, which wanted each slice printed as a list: CH5_R4 reads the item names in
  // order instead. The re-run items are animals, so no label word can pass for one.
  // The task names its own 6-item list and never says the slices must work for any list, so slices with
  // fixed positions, such as items[4:6] for the last 2, are fine (fixture m_cu1_fixed_positions). So the
  // slices' re-run has 6 items too, and only the count's re-run has 7: a typed print(6) fails it
  // (wrong/r4_typed_count).
  // The task text doesn't say "slice", but the room is about slicing: its NPC and both hints teach it, and
  // one index at a time, as in print(items[0], items[1], items[2]), passed the output and the re-run
  // (wrong/adv_all_indexes_no_slices). Three groups of items need three slices.
  ch5_r4: {
    output: [{ expr: py`${CH5_R4}(L, ['map', 'torch', 'key', 'gem', 'scroll', 'ring'], strict=True)`, hint: "Print four things in the task's order: the first 3 items, the last 2, the middle ones from index 2 to 4, and then the count." }],
    concepts: [{ expr: py`count(ast.Slice) >= 3`, hint: "This room is about slicing. Get each group of items with one slice, like items[1:4], instead of one index at a time." }],
    probes: [
      { expr: py`${CH5_R4}(rerun(${EVERY}('items', "['ant', 'bee', 'cat', 'dog', 'elk', 'fox']"))[0], ['ant', 'bee', 'cat', 'dog', 'elk', 'fox'])`, hint: "Print slices of the items list, like items[:3], instead of typing the items, so they'd change if the list did." },
      { expr: py`nums([7], L=rerun(${EVERY}('items', "['ant', 'bee', 'cat', 'dog', 'elk', 'fox', 'gnu']"))[0])`, hint: "Print the count with len(items) instead of typing the number, so it would change if the list did." },
    ],
  },
  // Changed from the prototype, which only looked for the list and a 4 anywhere: see LIST_AND_LEN. The
  // re-run also checks the printed length, so a typed print(4) fails (wrong/adv_typed_list_len). Its words
  // have 2, 3, 4, 5 and 7 letters, so a filter picked to fit the task's words, such as 4 or 5 letters,
  // fails (wrong/adv_len_4_or_5). Two of its short words come in a row, so removing the short words from
  // words while looping over it skips one (wrong/r2_remove_while_looping). The list can be printed joined,
  // as "quick, jumps, over, lazy": see WORDS_AND_LEN.
  ch5_r5: {
    output: [{ expr: py`${WORDS_AND_LEN}(L, ['quick', 'jumps', 'over', 'lazy'], 4)`, hint: "After your loop, print long_words and its length, and check that it keeps only the words with more than 3 letters." }],
    probes: [
      { expr: py`ns.get('long_words') == ['quick', 'jumps', 'over', 'lazy']`, hint: "Build long_words from the words list, adding each word that has more than 3 letters." },
      { expr: py`(lambda t, r: r.ns.get('long_words') == ['hello', 'planets', 'tree'] and ${WORDS_AND_LEN}(t, ['hello', 'planets', 'tree'], 3))(*rerun(${EVERY}('words', "['hello', 'hi', 'cat', 'planets', 'tree']")))`, hint: "In your loop, add each word with more than 3 letters to long_words without changing words itself, and print len(long_words), so it would work for any list of words." },
    ],
  },
  // Changed from also wanting the in keyword: the task text only says to check whether each book exists,
  // and names no tool (only the NPC names in and not in), so library.count(book) > 0 (fixture
  // r2_count_method) and a loop that compares each book with == (fixture adv_manual_search_loop, which was
  // a wrong fixture) are correct answers. The content could name in in the task text.
  ch5_s1: {
    output: [{ expr: py`${CH5_S1_ANSWERS}(L) == [1, -1, 1, -1] or ${CH5_S1_GROUPED}(L) == [1, -1, 1, -1]`, hint: "Check the four names in the task's order, spelled with the same capital letters, and print whether each one is in the library." }],
    probes: [
      { expr: py`(lambda t: ${CH5_S1_ANSWERS}(t) == [-1, 1, -1, 1] or ${CH5_S1_GROUPED}(t) == [-1, 1, -1, 1])(rerun(${EVERY}('library', "['Ruby', 'Math']"))[0])`, hint: "Check each name against the library list, like if \"Python\" in library:, so your answers would change if the library changed." },
    ],
  },
  // Changed from exactly the 4 lines: a title line before them, such as "Hero roster:", is fine (fixture
  // r2_header_line), as in the other rooms. The hero lines are 4 lines in a row that match the task's in
  // small letters with spaces and punctuation left out (LOOSE), so "0 : Link" is a near miss, and each line
  // gets a hint that names it (wrong/r2_spaced_colon).
  ch5_s2: {
    output: [
      { expr: py`${RUN_OF}(L, ['0: Link', '1: Mario', '2: Samus', '3: Kirby']) is not None`, hint: "Loop over enumerate(heroes) and print each hero's number and name on a line of its own, in the list's order, starting with 0: Link." },
      { expr: py`${RUN_OF}(L, ['0: Link', '1: Mario', '2: Samus', '3: Kirby'])[0] == '0: Link'`, hint: "So close! Check the capital letters, spaces and punctuation in your line for Link: it should look just like 0: Link from the task." },
      { expr: py`${RUN_OF}(L, ['0: Link', '1: Mario', '2: Samus', '3: Kirby'])[1] == '1: Mario'`, hint: "So close! Check the capital letters, spaces and punctuation in your line for Mario: it should look just like 1: Mario from the task." },
      { expr: py`${RUN_OF}(L, ['0: Link', '1: Mario', '2: Samus', '3: Kirby'])[2] == '2: Samus'`, hint: "So close! Check the capital letters, spaces and punctuation in your line for Samus: it should look just like 2: Samus from the task." },
      { expr: py`${RUN_OF}(L, ['0: Link', '1: Mario', '2: Samus', '3: Kirby'])[3] == '3: Kirby'`, hint: "So close! Check the capital letters, spaces and punctuation in your line for Kirby: it should look just like 3: Kirby from the task." },
    ],
    // Changed from calls('enumerate') >= 1, which a bare enumerate(heroes) line passed (wrong/adv_enumerate_statement).
    concepts: [{ expr: py`${LOOPS_OVER}('enumerate')`, hint: "This room is about enumerate(). Loop over it, like for i, hero in enumerate(heroes):, to get each hero's number and name together." }],
    probes: [
      { expr: py`(lambda T: ['0: A', '1: B'] in [T[k:k + 2] for k in range(len(T))])([l for l in rerun(${EVERY}('heroes', "['A', 'B']"))[0] if l.strip()])`, hint: "Print the number and name that enumerate() gives you, instead of typing them." },
    ],
  },
  // Changed from has(doubles, long), which wanted doubles first: the task only says "Print both"
  // (fixture adv_long_printed_first).
  ch5_s3: {
    output: [{ expr: py`has('[2, 4, 6, 8, 10]') and has("['hello', 'howdy']")`, hint: "Print both lists, and check that doubles uses range(1, 6) as the task shows, and that long keeps only the words with more than 3 letters." }],
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
      // The comprehension with the if has to go over all four words, not only the ones the kid picked out
      // by hand (wrong/r1_typed_long_words_source). Its iterable is worked out in the program: words, a typed
      // list or "hi hello hey howdy".split() all work (fixture r1_split_string_source). One that can't be
      // worked out there, such as a function's parameter, is left alone (fixture r1_function_filter).
      { expr: py`any(n.generators[0].ifs and (lambda v: (isinstance(v, tuple) and v[:1] == ('__error__',)) or (isinstance(v, (list, tuple, set)) and {'hi', 'hello', 'hey', 'howdy'} <= {x for x in v if isinstance(x, str)}))(val(ast.unparse(n.generators[0].iter))) for n in ast.walk(TREE) if isinstance(n, ast.ListComp))`, hint: "Run your comprehension over all four words from the task, and let its if pick out the long ones." },
      // The printed lists must be the variables: built with comprehensions, then printed as typed copies,
      // they passed (wrong/r3_typed_prints_after_build). Every top-level doubles = ... and long = ... is
      // replaced, so a list set up empty first and built on a later line is still replaced.
      { expr: py`(lambda t: has('[7]', L=t) and has("['zz']", L=t))(rerun({'doubles': '[7]', 'long': "['zz']"}, all=True)[0])`, hint: "Print the doubles and long lists themselves, like print(doubles), instead of typing them." },
    ],
  },
  // Changed from the prototype, which wanted the item lines first and a 29 anywhere after them: see
  // BLOCK_THEN_TOTAL. Item lines that differ from "[item] x[count]" only in capitals, spaces or punctuation,
  // like "Sword X1" or "Sword x 1", pass the first check and fail the second, which says so
  // (wrong/r1_capital_X, wrong/r1_space_after_x).
  ch5_boss: {
    output: [
      { expr: py`${BLOCK_THEN_TOTAL}(L, ['Sword x1', 'Potion x5', 'Arrow x20', 'Gem x3'], 29, ${LOOSE})`, hint: "Change both lists first, adding Gem and taking Shield out of each, then print one line per item as [item] x[count] and the total after them." },
      { expr: py`${BLOCK_THEN_TOTAL}(L, ['Sword x1', 'Potion x5', 'Arrow x20', 'Gem x3'], 29)`, hint: "So close! Check the capital letters, spaces and punctuation in your item lines: each one should look like [item] x[count] from the task." },
    ],
    probes: [
      { expr: py`ns.get('inventory') == ['Sword', 'Potion', 'Arrow', 'Gem'] and ns.get('counts') == [1, 5, 20, 3]`, hint: "Change the inventory and counts lists themselves: add Gem to both, and take Shield out of both." },
      { expr: py`${BLOCK_THEN_TOTAL}(rerun({**${EVERY}('inventory', "['Shield', 'Bow']"), **${EVERY}('counts', '[2, 7]')})[0], ['Bow x7', 'Gem x3'], 10)`, hint: "Find where Shield is with inventory.index() instead of typing its position, and add up the counts with your code." },
    ],
  },
  // Changed from the prototype, which wanted the length on the last line: see LIST_AND_LEN (the length can
  // come first, fixture adv_length_first). The re-run list has a 10, so n >= 10 fails (wrong/adv_at_least_10).
  // The numbers can be printed one per line too (fixture r3_each_on_line): see ITEM_LINES.
  grind_8: {
    output: [{ expr: py`${LIST_AND_LEN}(L, '[12, 23, 17, 21]', 4) or ${ITEM_LINES}(L, [12, 23, 17, 21], 4)`, hint: "Print your new list of only the numbers bigger than 10, and the length of that new list, not of numbers." }],
    probes: [
      { expr: py`(lambda t: ${LIST_AND_LEN}(t, '[11, 50]', 2) or ${ITEM_LINES}(t, [11, 50], 2))(rerun(${EVERY}('numbers', '[11, 3, 10, 50]'))[0])`, hint: "Build your new list from numbers with a loop, keeping only numbers bigger than 10, and print its len(), so it would work for any numbers." },
    ],
  },
  // The task never says to print the reversed list, so building it is enough (fixture r1_built_not_printed):
  // the list can be printed, or be one of the program's variables. So can the re-run's [1, 9, 3].
  grind_9: {
    output: [{ expr: py`has('[5, 4, 3, 2, 1]') or [5, 4, 3, 2, 1] in globals_of(list)`, hint: "Build a new list with your loop that holds the numbers in reverse order, then print it to check it." }],
    concepts: [
      // Only a .reverse() method call counts: the kid's own def reverse(lst) is fine (fixture adv_func_named_reverse).
      { expr: py`not any(isinstance(n, ast.Call) and isinstance(n.func, ast.Attribute) and n.func.attr == 'reverse' for n in ast.walk(TREE))`, hint: "The task says not to use .reverse(). Build the reversed list yourself." },
      // A list comprehension is a for loop too, one the kids met in ch5_s3, so one that picks the items by
      // index, as [original[i] for i in range(len(original) - 1, -1, -1)] does, builds the list with a loop
      // (fixture r3_comprehension). The next two checks still keep reversed() and [::-1] out of it.
      { expr: py`count(ast.For, ast.While) >= 1 or ${REVERSING_COMP}`, hint: "Use a for or while loop to build your new reversed list." },
      // The task says to build the reversed list with a loop, so the loop has to do the reversing. reversed()
      // and [::-1] do it for the kid, as .reverse() would (wrong/adv_reversed_builtin_loop,
      // wrong/adv_slice_then_loop_print). The prototype allowed them because the task text names only
      // .reverse(); the content could name them too, as its expectedBehavior ("not built-in reverse") does.
      { expr: py`calls('reversed') == 0 and not has_slice_step()`, hint: "Do the reversing yourself in your loop: reversed() and [::-1] do it for you, just like .reverse()." },
      // The loop has to build the new list: append, insert, extend, [x] + new, new += [x] or new[i] = ... in it,
      // or a swap such as new[i], new[-1 - i] = new[-1 - i], new[i] on a copy (fixture r2_swap_copy).
      // A loop that only prints each item doesn't (wrong/adv_slice_then_loop_print, wrong/adv_sorted_reverse_loop_print).
      { expr: py`any(isinstance(n, (ast.For, ast.While)) and any((isinstance(m, ast.Call) and isinstance(m.func, ast.Attribute) and m.func.attr in ('append', 'insert', 'extend')) or (isinstance(m, ast.BinOp) and isinstance(m.op, ast.Add) and (isinstance(m.left, ast.List) or isinstance(m.right, ast.List))) or (isinstance(m, ast.AugAssign) and isinstance(m.op, ast.Add) and isinstance(m.value, ast.List)) or (isinstance(m, ast.Assign) and any(isinstance(x, ast.Subscript) for t in m.targets for x in ast.walk(t))) for m in ast.walk(n)) for n in ast.walk(TREE)) or ${REVERSING_COMP}`, hint: "Build the new list inside your loop, adding one item to it each time round." },
    ],
    probes: [
      // Changed from [7, 8, 9]: sorted backwards, an ascending list looks reversed (wrong/adv_sort_descending).
      { expr: py`(lambda t, r: has('[1, 9, 3]', L=t) or [1, 9, 3] in [v for k, v in r.ns.items() if not k.startswith('__') and type(v) is list])(*rerun(${EVERY}('original', '[3, 9, 1]')))`, hint: "Build the reversed list from original with your loop, so it would work for any list." },
    ],
  },

  // ---------- Chapter 6: functions ----------
  // The war cry can take more than one line (fixture adv_two_line_cry). Other lines are fine, such as an
  // intro line before the calls (fixture r1_intro_line), and so are blank ones, as a print() after the cry
  // gives (fixture r1_blank_after_cry). So the output only has to show something; the probes check that
  // battle_cry prints its cry and is called 3 times, and that the cry shows up 3 times. Their hints each name
  // one mistake: a battle_cry that returns its cry instead of printing it, print(battle_cry()), which prints
  // the cry and then the None it gives back, and a loop inside battle_cry get their own.
  ch6_r1: {
    output: [
      { expr: py`any(l.strip() for l in L)`, hint: "Nothing showed up yet! Use print() inside battle_cry to show your war cry, then call battle_cry() 3 times." },
    ],
    probes: [
      { expr: py`sig('battle_cry') == (0, 0)`, hint: "Define a function called battle_cry with def and empty parentheses: it doesn't need any inputs." },
      { expr: py`bool(call('battle_cry()')[1])`, hint: "battle_cry should show the war cry itself: put print() inside the function." },
      { expr: py`not ('None' in [l.strip() for l in L] and any(isinstance(c, ast.Call) and getattr(c.func, 'id', '') == 'print' and any(isinstance(a, ast.Call) and getattr(a.func, 'id', '') == 'battle_cry' for a in ast.walk(c)) for c in ast.walk(TREE)))`, hint: "battle_cry() prints the war cry already, so call it on a line by itself, not inside print(): that prints the None it gives back." },
      { expr: py`not (in_func('battle_cry', ast.For, ast.While) and trace.count('battle_cry') < 3)`, hint: "Each call to battle_cry() should print your war cry once. Call it 3 times instead of looping inside it." },
      { expr: py`trace.count('battle_cry') == 3`, hint: "Call battle_cry() exactly 3 times." },
      // A battle_cry that picks a different cry each time, say with random.choice(), is fine (fixture
      // r2_random_cry): when 6 calls don't all print the same thing, each only has to print something. A cry
      // printed with end=" " puts all 3 on one line, "Charge! Charge! Charge!" (fixture r3_end_space_one_line),
      // so the cry's text showing up 3 times in the output is fine too.
      { expr: py`(lambda O: all(O) and (len(set(map(tuple, O))) > 1 or subseq(O[0] * 3, L=[l for l in L if l.strip()]) or ' '.join(L).count(' '.join(O[0]).strip()) >= 3))([[l for l in call('battle_cry()')[1] if l.strip()] for _ in range(6)])`, hint: "Each call to battle_cry() should print the same war cry, so it shows up 3 times." },
    ],
  },
  // A line that differs from "[name] — Level [level]" only in capitals, spaces or punctuation, like
  // "Knight - level 5" or "Knight: Level 5", is a near miss (the design's rule): it still fails, but with a
  // hint that says so (wrong/lowercase_level, wrong/r1_colon_not_dash). Whether the words match is read from
  // what hero_status prints for a test hero, Zed at level 99: "Zed is level 99" isn't a near miss, so it gets
  // the hint about the words instead (wrong/r1_words_differ, wrong/r1_has_level). The status lines are the last 3 lines holding the word Level, so a
  // title line before them (fixture adv_header_line) or a closing line after them (fixture r1_closing_line)
  // is fine.
  ch6_r2: {
    output: [
      { expr: py`any(l.strip() for l in L)`, hint: "Nothing showed up yet! Use print() inside hero_status to show the hero's line, then call hero_status 3 times." },
      { expr: py`(lambda S: len(S) >= 3 and len(set(S[-3:])) == 3 and all(re.fullmatch(r'(?i).+?\W*level\W*\S+', l) for l in S[-3:]))(${HERO_LINES}(L))`, hint: "Call hero_status 3 times with 3 different heroes, so it prints 3 lines like [name] — Level [level]." },
      { expr: py`(lambda S, T: all(re.fullmatch(r'.+?\s*[—–-]+\s*Level\s+\S+', l) for l in S[-3:]) or (len(T) == 1 and 'Zed' in T[0] and '99' in T[0] and ${LOOSE}(T[0].replace('Zed', 'NAME').replace('99', 'LVL')) == 'namelevellvl'))(${HERO_LINES}(L), call("hero_status('Zed', 99)")[1])`, hint: "Check the words in your hero lines: each should be just the hero's name, then — Level, then the level, like [name] — Level [level] in the task." },
      { expr: py`all(re.fullmatch(r'.+?\s*[—–-]+\s*Level\s+\S+', l) for l in ${HERO_LINES}(L)[-3:])`, hint: "So close! Check the capital letters, spaces and punctuation in your hero lines: each should look like [name] — Level [level] from the task (a plain - works fine)." },
      // hero_status(5, "Knight") prints "5 — Level Knight" (wrong/adv_args_swapped); so does a swapped
      // f-string (wrong/adv_fstring_swapped), so the hint names both.
      { expr: py`all((lambda m: m is not None and not re.fullmatch(r'-?\d+(\.\d+)?', m.group(1).strip()))(re.fullmatch(r'(.+?)\s*[—–-]+\s*Level\s+\S+', l)) for l in ${HERO_LINES}(L)[-3:])`, hint: "Each line should start with the hero's name and end with the level, like Knight — Level 5. Check the order in your calls and in your print." },
    ],
    probes: [
      { expr: py`sig('hero_status') == (2, 0)`, hint: "hero_status needs two parameters in its parentheses: one for the name and one for the level." },
      // The name has to come before "Level" and the level after it (wrong/adv_fstring_swapped).
      { expr: py`(lambda t: len(t) == 1 and re.fullmatch(r'.*Zed\s*[—–-]+\s*Level\s+99\S*', t[0]) is not None)(call("hero_status('Zed', 99)")[1])`, hint: "hero_status should print the name it is given, then — Level, then the level it is given, using its parameters." },
      { expr: py`trace.count('hero_status') == 3`, hint: "Call hero_status 3 times, once for each hero." },
      // One hero at three levels isn't 3 different heroes (wrong/r3_same_name_levels). This comes after the
      // probe above that tries Zed, so a hero_status that prints a global name instead of its parameter is
      // told about that instead.
      { expr: py`len({re.fullmatch(r'(.+?)\s*[—–-]+\s*Level\s+\S+', l).group(1).strip() for l in ${HERO_LINES}(L)[-3:]}) == 3`, hint: "Call hero_status with 3 different heroes, each with a name of its own." },
    ],
  },
  // Changed from exactly 1 line, all of it "Damage dealt: [result]": other lines are fine (fixture
  // adv_intro_line), and so is a word after the number, as in "Damage dealt: 24 HP" (fixture adv_units_word).
  // The damage lines are the ones that start with "Damage dealt: ", in the output and in the re-runs, and
  // there can be more than one: storing and printing two results is fine (fixture r1_two_attacks). A line
  // that differs only in capitals, spaces or punctuation, like "damage dealt: 30" or "Damage dealt = 30",
  // passes the first check and fails the second, which says so (wrong/r1_lowercase_label, wrong/r1_equals_label).
  ch6_r3: {
    output: [
      { expr: py`any(re.match(r'damage dealt \S', ' '.join(re.sub(r'[^\w.]+', ' ', l.lower()).split())) for l in L)`, hint: "Print your stored result on a line that starts with Damage dealt:, as the task shows." },
      { expr: py`any(re.match(r'Damage dealt: \S', l) for l in L)`, hint: "So close! Check the capital letters, spaces and punctuation in your Damage dealt line: it should look like Damage dealt: [result] from the task." },
      // A calculate_damage with no return gives back None, so the line shows None (wrong/r3_forgot_return):
      // the next check's hint, about a variable's name, doesn't fit that.
      { expr: py`not any(re.match(r'Damage dealt: None\b', l) for l in L)`, hint: "Your Damage dealt line shows None: that means calculate_damage isn't giving back its answer yet, so add a return to it." },
      // print("Damage dealt: {result}") with no f, or print("Damage dealt: result"), prints the name instead
      // of the value (wrong/r2_missing_f_prefix, wrong/r2_literal_word_result): the probe's hint below, about
      // typed numbers, doesn't fit them.
      { expr: py`all(re.search(r'\d', l) for l in L if re.match(r'Damage dealt: \S', l))`, hint: "Your Damage dealt line should show the number stored in your variable, not the variable's name: check for the f before an f-string's quotes, or print the variable after a comma." },
    ],
    probes: [
      { expr: py`call('calculate_damage(4, 5)') == (20, []) and val('calculate_damage(3, 0.5)') == 1.5`, hint: "calculate_damage should give back base * multiplier with return, not print it." },
      // Changed from comparing the printed value with every global, which a stored damage next to a typed
      // print("Damage dealt: 30") passed (wrong/adv_typed_result). Each top-level variable set from
      // calculate_damage is replaced with calculate_damage(37, 3), one re-run each, and every damage line must
      // show 111 in one of those re-runs. So a second damage line that is typed fails too, while a stored
      // result that is never printed is fine. Only the calls in the value are changed, so the rest of it
      // stays: damage = str(calculate_damage(10, 3)) becomes str(calculate_damage(37, 3)) (fixture
      // r2_str_wrap_concat). A result stored inside a loop or a function can't be replaced that way, since a
      // re-run only changes top-level lines, so then CH6_R3_NESTED reads the program instead (fixtures
      // r3_loop_two_attacks, r3_one_attack_in_function_main).
      { expr: py`(lambda A: (lambda K, D: bool(K) and bool(D) and (lambda R: all(any(len(r) == len(D) and nums([111], L=[r[i]]) for r in R) for i in range(len(D))))([[l for l in rerun({k: src})[0] if re.match(r'Damage dealt: \S', l)] for k, src in K]))([('%s#%d' % (x, sum(y == x for y, _ in A[:i + 1])), (lambda v: ([setattr(c, 'args', [ast.Constant(37), ast.Constant(3)]) or setattr(c, 'keywords', []) for c in ast.walk(v) if isinstance(c, ast.Call) and getattr(c.func, 'id', '') == 'calculate_damage'], ast.unparse(v))[1])(ast.parse(ast.unparse(n.value), mode='eval').body)) for i, (x, n) in enumerate(A) if any(isinstance(c, ast.Call) and getattr(c.func, 'id', '') == 'calculate_damage' for c in ast.walk(n.value))], [l for l in L if re.match(r'Damage dealt: \S', l)]))([(n.targets[0].id, n) for n in TREE.body if isinstance(n, ast.Assign) and len(n.targets) == 1 and isinstance(n.targets[0], ast.Name)]) or ${CH6_R3_NESTED}`, hint: "Store the answer from calculate_damage in a variable first, then print that variable instead of a number you typed." },
    ],
  },
  ch6_r4: {
    output: [
      // The task never says to print, so a kid who only calls power_up sees nothing: say what to do.
      { expr: py`any(l.strip() for l in L)`, hint: "Nothing showed up yet! power_up gives its message back, so print what it gives back, like print(power_up(\"Knight\"))." },
      // A message that differs only in capitals or punctuation, like "Knight gained 10 power" with no !, passes
      // this and fails the next check, which says so (wrong/r1_no_exclaim).
      // The messages are looked for inside the lines, so both can share one, as
      // print(power_up("Knight"), power_up("Mage", 25)) prints them (fixture r2_one_print_two_calls).
      { expr: py`(lambda T: any(re.search(r'\S gained 10 power(?!\w)', l) for l in T) and any(re.search(r'\S gained (?!10(?![\d.]))-?\d+(\.\d+)? power(?!\w)', l) for l in T))([' '.join(re.sub(r'[^\w\s.-]', ' ', l.lower()).split()).strip('. ') for l in L])`, hint: "Print what power_up gives back twice: once with just a name, so the amount is 10, and once with a name and your own amount." },
      { expr: py`any(re.search(r'\S gained 10 power!(?!\S)', l) for l in L) and any(re.search(r'\S gained (?!10(?![\d.]))-?\d+(\.\d+)? power!(?!\S)', l) for l in L)`, hint: "So close! Check the capital letters and punctuation in your messages: each should look like [name] gained [amount] power! from the task." },
    ],
    probes: [
      { expr: py`sig('power_up') == (2, 1)`, hint: "Give power_up two parameters, name and amount, and make amount 10 unless it's given." },
      { expr: py`call("power_up('Zed')")[0] == 'Zed gained 10 power!'`, hint: "power_up should return the message instead of printing it. Print what it gives back." },
      { expr: py`val("power_up('Zed', 7)") == 'Zed gained 7 power!'`, hint: "Put the amount parameter in the message, so a custom amount shows up in it." },
      // The output check alone passes a second message typed into print() (fixture wrong/typed_second).
      { expr: py`{len(n.args) + len(n.keywords) for n in ast.walk(TREE) if isinstance(n, ast.Call) and getattr(n.func, 'id', '') == 'power_up'} >= {1, 2}`, hint: "Call power_up twice and print what it gives back: once with just a name, and once with a name and your own amount." },
      // Calls on lines of their own, or stored and never used, then both messages typed into print()
      // (wrong/adv_typed_both, wrong/adv_stored_then_typed).
      { expr: py`${USES_ANSWER}('power_up', 'Zed')`, hint: "Print what power_up gives back, like print(power_up(\"Knight\")), instead of typing the messages yourself." },
    ],
  },
  // The task sets no order for printing the two values (fixture r2_print_highest_first) or for returning
  // them (fixture r2_max_first_unpacked). So a program that unpacks them the wrong way round, and labels
  // 95 the average, would pass the rest: the second output check reads the labels (wrong/r2_swapped_labels).
  ch6_r5: {
    output: [
      { expr: py`numset([87.6, 95])`, hint: "Print both answers from analyze_scores: the average, which is the sum divided by how many scores there are, and the highest score." },
      { expr: py`not any((lambda a, h, A, H: (a and not h and H and not A) or (h and not a and A and not H))(re.search(r'(?<![\d.])87\.60*(?!\d)', l), re.search(r'(?<![\d.])95(?:\.0+)?(?![\d.])', l), re.search(r'(?i)\b(aver|avg|mean)', l), re.search(r'(?i)\b(high|max|best|top)', l)) for l in L)`, hint: "Check your labels: the average is the sum divided by len and the highest is the max, so make sure each number is printed next to its own name." },
    ],
    probes: [
      // A list of the two values unpacks just like a tuple (fixture ALT_list_return).
      { expr: py`(lambda v: isinstance(v, (tuple, list)) and list(v) in ([2.0, 3], [3, 2.0]))(val('analyze_scores([1, 2, 3])'))`, hint: "analyze_scores should return two things for any list: the average (sum divided by len) and the highest score." },
      { expr: py`87.6 in [v for k, v in ns.items() if not k.startswith('__') and isinstance(v, float)] and any(v == 95 and type(v) is int for k, v in ns.items() if not k.startswith('__'))`, hint: "Unpack what analyze_scores returns into two separate variables, then print both." },
      { expr: py`numset([15.0, 20], L=rerun(${EVERY}('scores', '[10, 20]'))[0])`, hint: "Work out both answers from the scores list with your function, so they change when the scores do." },
    ],
  },
  // The three ratings can share a line (fixture adv_one_line). They are on 3 lines in a row, or on one line,
  // so a title line before them (fixture adv_header_line) or a closing line after them (fixture
  // r1_closing_line) is fine. Ratings for every level from 1 to 10 don't give 10, 30 and 55 in a row.
  ch6_s1: {
    output: [{ expr: py`any(nums_per_line([10, 30, 55], L=L[k:k + 3]) or nums([10, 30, 55], L=L[k:k + 1]) for k in range(len(L)))`, hint: "Print what power_rating gives back for levels 1, 5 and 10, in that order, and check that each function uses its formula from the task." }],
    probes: [
      { expr: py`val('calc_attack(2)') == 6 and val('calc_defense(2)') == 9 and val('power_rating(2)') == 15`, hint: "Make each function return the answer to its formula from the task, using its level parameter." },
      { expr: py`called_from('calc_attack', 'power_rating') and called_from('calc_defense', 'power_rating')`, hint: "power_rating should call calc_attack and calc_defense and add up what they return." },
      // One real call next to typed-in ratings passed without this (wrong/adv_one_call_rest_typed), and so did
      // ratings stored and never used (wrong/adv_stored_then_typed).
      { expr: py`trace.count('power_rating') >= 3 and ${USES_ANSWER}('power_rating', 1)`, hint: "Print what power_rating gives back for each level, 1, 5 and 10, instead of typing the numbers." },
    ],
  },
  ch6_s2: {
    output: [
      // Changed from 'calculate_area(width, height)': the room is about docstrings, so other parameter
      // names are fine (fixture adv_short_param_names).
      { expr: py`has('Help on function calculate_area', 'calculate_area(')`, hint: "After your function, call help(calculate_area) so Python shows its help page." },
      { expr: py`isinstance(ns.get('calculate_area'), type(lambda: 0)) and bool(ns['calculate_area'].__doc__) and ns['calculate_area'].__doc__.strip().splitlines()[0].strip() in out`, hint: "Write your docstring as a string in triple quotes on the first line inside calculate_area, not as a # comment, so help() can show it." },
    ],
    probes: [
      { expr: py`val('calculate_area(3, 4)') == 12`, hint: "calculate_area should return width * height." },
      { expr: py`bool((ns['calculate_area'].__doc__ or '').strip())`, hint: "Put a docstring, a string in triple quotes, on the first line inside calculate_area." },
    ],
  },
  // Changed from exactly 2 lines: printing the global score before the call too is a fine way to show
  // they're independent (fixture adv_before_and_after), and so is a closing line such as "See? They're
  // independent!" (fixture r1_independent_line). So the output needs a 50 and then a 100 after it.
  // The prototype read no variables, so typed lines passed (wrong/adv_typed_values, adv_never_called).
  ch6_s3: {
    output: [{ expr: py`nums([50, 100])`, hint: "First call your function so it prints its own local score, then print the global score, which the function shouldn't change." }],
    concepts: [
      { expr: py`any_func_assigns('score')`, hint: "Inside your function, make its own score = 50 before printing it." },
      { expr: py`count(ast.Global) == 0`, hint: "Don't use the global keyword here: the function's score should stay separate from the one outside." },
      { expr: py`any(isinstance(c, ast.Call) and getattr(c.func, 'id', '') == 'print' and any(isinstance(m, ast.Name) and m.id == 'score' for m in ast.walk(c)) for f in fdef() if assigns_in_func(f.name, 'score') for c in ast.walk(f))`, hint: "Inside your function, print the score variable itself, like print(score), instead of typing 50." },
    ],
    probes: [
      { expr: py`ns.get('score') == 100`, hint: "Keep a variable called score, equal to 100, outside the function." },
      // The function is called with 100 for each parameter it needs, as show(score) would be: a parameter
      // named score that the function sets to 50 is fine (fixture r1_param_shadow). What it prints must come
      // before the last line that holds 100.
      { expr: py`any(f.name in trace and (lambda t: bool(t) and nums([50], L=t) and (lambda j: all(l in L[:j] for l in t))(max((i for i, l in enumerate(L) if nums([100], L=[l])), default=0)))(callf(f.name, *[100] * (len(f.args.args) - len(f.args.defaults)))[1]) for f in fdef() if assigns_in_func(f.name, 'score'))`, hint: "Call your function before you print the global score, so its local 50 shows up first." },
      { expr: py`nums([50, 7], L=rerun({'score': '7'})[0])`, hint: "After calling your function, print the global score variable itself, like print(score), instead of typing 100." },
    ],
  },
  // The task text calls a parameter str, which shadows the built-in; the content could rename it.
  // Changed from len(L) >= 3: a report on one line is a correct answer (fixture ALT_one_line_report).
  // The probes check what hero_report prints.
  ch6_boss: {
    output: [{ expr: py`len(L) >= 1`, hint: "Nothing showed up yet! Call hero_report with some sample values, so it prints the hero's report." }],
    probes: [
      { expr: py`val('calc_attack(3, 4)') == 10 and val('calc_defense(4, 2)') == 7.0`, hint: "calc_attack and calc_defense should each return the value from the task's formula." },
      { expr: py`sig('hero_report') == (5, 0)`, hint: "hero_report needs 5 parameters: the name and the four numbers." },
      // The four numbers are all different, so passing the wrong one on, as calc_defense(weapon, shield)
      // does, changes an answer (wrong/r2_defense_uses_weapon, wrong/r2_attack_uses_armor). A report that
      // shows the name but a wrong attack or defense gets its own hint.
      { expr: py`(lambda t: 'Zed' not in '\n'.join(t) or numset([10, 9.0], L=t))(call("hero_report('Zed', 3, 4, 6, 2)")[1])`, hint: "Work out the attack and defense from hero_report's own parameters: calc_attack gets the strength and weapon, and calc_defense the armor and shield." },
      { expr: py`(lambda t: 'Zed' in '\n'.join(t) and numset([10, 9.0, 19.0], L=t))(call("hero_report('Zed', 3, 4, 6, 2)")[1])`, hint: "hero_report should print the name, attack, defense and total power for the values it is given." },
      { expr: py`called_from('calc_attack', 'hero_report') and called_from('calc_defense', 'hero_report')`, hint: "Inside hero_report, call calc_attack and calc_defense instead of doing their math again." },
    ],
  },
  // The two tests can come in either order (fixture ALT_reverse_order); the probes check the functions.
  grind_10: {
    output: [{ expr: py`numset([32.0, 100.0])`, hint: "Print what both functions give back for the task's tests, 0°C and 212°F, and check that each one follows its formula, brackets and all." }],
    probes: [
      // The hints name the formula: they also show for a function that returns a wrong answer.
      { expr: py`val('celsius_to_fahrenheit(100)') == 212 and val('celsius_to_fahrenheit(-40)') == -40`, hint: "celsius_to_fahrenheit(c) should return c * 9/5 + 32 (use return, not print), so it works for any temperature." },
      { expr: py`val('fahrenheit_to_celsius(32)') == 0 and val('fahrenheit_to_celsius(212)') == 100`, hint: "fahrenheit_to_celsius(f) should return (f - 32) * 5/9 (use return, not print), so it works for any temperature." },
      // Every value above converts to a whole number, so // and int() passed (wrong/adv_floor_division,
      // wrong/adv_int_rounding). 37 C is 98.6 F and 100 F is 37.78 C; rounding to 1 or 2 places is fine.
      { expr: py`abs(val('celsius_to_fahrenheit(37)') - 98.6) < 0.06 and abs(val('fahrenheit_to_celsius(100)') - 340 / 9) < 0.06`, hint: "Keep the decimals in your answers: divide with / (not //), and don't turn the answer into a whole number with int()." },
      // Correct functions next to typed-in answers passed without this (wrong/adv_typed_output), and so did
      // answers stored and never used (wrong/adv_calls_stored_typed_print).
      { expr: py`'celsius_to_fahrenheit' in trace and 'fahrenheit_to_celsius' in trace and ${USES_ANSWER}('celsius_to_fahrenheit', 0) and ${USES_ANSWER}('fahrenheit_to_celsius', 212)`, hint: "Test both functions: print what celsius_to_fahrenheit(0) and fahrenheit_to_celsius(212) give back." },
      // Testing with 100 and 32 prints 32 and 100 too, as the typed temperatures (wrong/r1_other_test_values).
      { expr: py`${TESTED_WITH}('celsius_to_fahrenheit', [0]) and ${TESTED_WITH}('fahrenheit_to_celsius', [212])`, hint: "The task says to test with 0°C and 212°F: give celsius_to_fahrenheit a 0 and fahrenheit_to_celsius a 212." },
    ],
  },
  // A line holding two answers, as print(is_strong("hello"), is_strong("secret42")) prints, counts as two
  // (fixture adv_one_line): see YES_NO.
  grind_11: {
    output: [{ expr: py`${G11_YES_NO}(L) == [-1, 1]`, hint: "Test is_strong with \"hello\" and then with \"secret42\", and print what it says about each one." }],
    probes: [
      // The digit can be anywhere, and it has to be a digit: '1abcdefgh' and 'abcdefg9' are strong, and
      // 'password!' isn't (wrong/adv_last_char_digit, wrong/adv_not_isalpha, wrong/adv_checks_4_and_2).
      // 'abcdefg0' is strong too, so a digit test that leaves out 0, like ch in "123456789", fails
      // (wrong/r2_no_zero_digit).
      { expr: py`[val('is_strong(%r)' % p) for p in ['hello', 'secret42', 'abcdefgh', 'abc1', '12345678', '1abcdefgh', 'password!', 'abcdefg9', 'abcdefg0']] == [False, True, False, False, True, True, False, True, True]`, hint: "is_strong should return True only when both rules are met: at least 8 characters AND at least one digit (0 to 9) anywhere in it." },
      // A correct is_strong next to typed-in answers passed without this (fixture wrong/typed_prints), and
      // calls on lines of their own before the typed answers passed the trace alone (wrong/adv_calls_then_typed),
      // as did answers stored and never used (wrong/adv_stored_then_typed, adv_loop_stored_typed, adv_dict_stored_typed).
      { expr: py`trace.count('is_strong') >= 2 and ${USES_ANSWER}('is_strong', 'hello')`, hint: "Test your function: call is_strong with \"hello\" and with \"secret42\", and print what it tells you." },
      // Other passwords, one weak and one strong, give the same weak-then-strong answers (wrong/r1_other_test_passwords).
      { expr: py`${TESTED_WITH}('is_strong', ['hello', 'secret42'])`, hint: "Test with the two passwords from the task: give is_strong \"hello\" and then \"secret42\"." },
    ],
  },

  // ---------- Chapter 7: dictionaries ----------
  ch7_r1: {
    output: [{ expr: py`isinstance(ns.get('character'), dict) and ${CH7_R1}(L, ns['character'])`, hint: "Print all four values, name, class, level and health, each looked up with its key, like character[\"name\"], next to a label." }],
    probes: [
      { expr: py`set(ns.get('character', {})) >= {'name', 'class', 'level', 'health'} and all(isinstance(ns['character'][k], (int, float)) for k in ('level', 'health'))`, hint: "Your character dictionary needs the keys name, class, level and health, with numbers for level and health." },
      { expr: py`${CH7_R1}(rerun(${EVERY}('character', "{'name': 'Zed', 'class': 'Bard', 'level': 99, 'health': 7}"))[0], {'name': 'Zed', 'class': 'Bard', 'level': 99, 'health': 7})`, hint: "Print each value by looking it up with its key, like character[\"name\"], instead of typing it." },
    ],
  },
  // The printed dict can follow a label, as in print("Final player:", player) (fixture ALT_labelled), and
  // the probes check the dict itself. See SHOWS_DICT for how the output is read.
  ch7_r2: {
    output: [{ expr: py`${SHOWS_DICT}(L, {'name': 'Hero', 'xp': 100, 'gold': 75, 'level': 1, 'title': 'Adventurer'})`, hint: "Do all four steps to player, adding 25 to the gold it already has, and then print the final dictionary." }],
    probes: [
      { expr: py`ns.get('player') == {'name': 'Hero', 'xp': 100, 'gold': 75, 'level': 1, 'title': 'Adventurer'}`, hint: "Change the player dictionary itself, one step at a time, then print player." },
      { expr: py`rerun(${EVERY}('player', "{'name': 'Hero', 'xp': 5, 'gold': 10}"))[1].ns.get('player', {}).get('gold') == 35`, hint: "Increase gold by adding 25 to what it already is, instead of typing the new total." },
      // xp starts at 0, so xp += 100 also gives 100 in the main run (fixture wrong/xp_added).
      { expr: py`rerun(${EVERY}('player', "{'name': 'Hero', 'xp': 5, 'gold': 10}"))[1].ns.get('player', {}).get('xp') == 100`, hint: "Set xp to exactly 100 with =, instead of adding 100 to it." },
      // The re-run has to print its own final dict, with gold 35: a typed copy of the answer printed after
      // doing the steps doesn't change (wrong/r1_typed_final_after_steps).
      { expr: py`${SHOWS_DICT}(rerun(${EVERY}('player', "{'name': 'Hero', 'xp': 5, 'gold': 10}"))[0], {'name': 'Hero', 'xp': 100, 'gold': 35, 'level': 1, 'title': 'Adventurer'})`, hint: "At the end, print the player dictionary itself, like print(player), instead of typing out the final dictionary." },
    ],
  },
  // Changed from the prototype, which wanted the key: value lines first and a 55 anywhere after them: see
  // BLOCK_THEN_TOTAL. The concept was calls('items') >= 1, which a bare stats.items() line passed
  // (wrong/adv_items_statement). The task sets no order for the stat lines (fixture r3_sorted_items).
  // As in ch5_boss, a near miss such as "Strength: 15" or "strength = 15" gets its own hint
  // (wrong/r1_capitalized_keys, wrong/r1_equals_format).
  ch7_r3: {
    output: [
      { expr: py`${BLOCK_THEN_TOTAL}(L, ['strength: 15', 'speed: 12', 'magic: 8', 'luck: 20'], 55, ${LOOSE}, anyorder=True)`, hint: "Print one line for each stat as [key]: [value], and then the total of all the values after them." },
      { expr: py`${BLOCK_THEN_TOTAL}(L, ['strength: 15', 'speed: 12', 'magic: 8', 'luck: 20'], 55, anyorder=True)`, hint: "So close! Check the capital letters, spaces and punctuation in your stat lines: each one should look like [key]: [value] from the task, with the key just as stats has it." },
    ],
    concepts: [{ expr: py`${LOOPS_OVER}('items')`, hint: "Loop over the dictionary with for key, value in stats.items(): to get each key and value together." }],
    probes: [
      { expr: py`${BLOCK_THEN_TOTAL}(rerun(${EVERY}('stats', "{'a': 1, 'b': 2}"))[0], ['a: 1', 'b: 2'], 3, anyorder=True)`, hint: "Print the keys and values and add up the total straight from the stats dictionary, instead of typing them." },
    ],
  },
  // A place's name and numbers don't have to share a line: printing the name, then each property on its own
  // line, is fine (fixture ALT_nested_loop). The task says to loop through and print each location, so the
  // places do need lines of their own, which print(world) doesn't give them (wrong/print_world).
  // The answer is the last line, or the last line that names just one place (ANSWER_AT), so a closing line
  // after it is fine (fixture r1_closing_line); the places are listed before it. Everything is read in
  // small letters, so place names printed with .title(), as "Forest" or "Best: Cave", are fine too
  // (fixture r1_title_case_names).
  ch7_r4: {
    output: [
      { expr: py`(lambda T: any(has('forest', '3', '5', 'cave', '8', '10', 'village', '1', '2', L=T[:i]) and re.search(r'\bcave\b', T[i]) for i in {len(T) - 1, ${ANSWER_AT}(T, ['forest', 'cave', 'village'])} - {None}))([l.lower() for l in L])`, hint: "Print each place with its danger and treasure, and then, after them, the place with the most treasure." },
      { expr: py`(lambda T: any(subseq([r're:.*\bforest\b.*', r're:.*\bcave\b.*', r're:.*\bvillage\b.*'], L=T[:i]) and re.search(r'\bcave\b', T[i]) for i in {len(T) - 1, ${ANSWER_AT}(T, ['forest', 'cave', 'village'])} - {None}))([l.lower() for l in L])`, hint: "Loop through world and print each place on its own line, with its danger and treasure." },
    ],
    probes: [
      { expr: py`ns.get('world') == {'forest': {'danger': 3, 'treasure': 5}, 'cave': {'danger': 8, 'treasure': 10}, 'village': {'danger': 1, 'treasure': 2}}`, hint: "Make the world dictionary just like the task shows, with a small dictionary inside for each place." },
      // mine's danger is 1, not the prototype's 9: with 9, mine had the most danger too, so a loop that
      // compared danger instead of treasure passed (fixture wrong/max_danger). The best place comes first, then
      // a poor one, then a middle one, so comparing each place with the one before it, instead of with the
      // best so far, picks cave (wrong/r3_compare_with_previous). The re-run's places and numbers must be
      // listed before the answer, so typed place lines next to a worked-out answer fail
      // (wrong/r3_typed_places_computed_best).
      { expr: py`(lambda T: any(re.search(r'\bmine\b', T[i]) for i in {len(T) - 1, ${ANSWER_AT}(T, ['mine', 'pit', 'cave'])} - {None}))([l.lower() for l in rerun(${EVERY}('world', "{'mine': {'danger': 1, 'treasure': 50}, 'pit': {'danger': 7, 'treasure': 3}, 'cave': {'danger': 8, 'treasure': 10}}"))[0]])`, hint: "Find the place with the most treasure by comparing each place's treasure, so it would work for any world." },
      // The same re-run, now with the places and numbers listed before the answer: this says what's wrong when only that is.
      { expr: py`(lambda T: any(re.search(r'\bmine\b', T[i]) and has('mine', '1', '50', 'pit', '7', '3', 'cave', '8', '10', L=T[:i]) for i in {len(T) - 1, ${ANSWER_AT}(T, ['mine', 'pit', 'cave'])} - {None}))([l.lower() for l in rerun(${EVERY}('world', "{'mine': {'danger': 1, 'treasure': 50}, 'pit': {'danger': 7, 'treasure': 3}, 'cave': {'danger': 8, 'treasure': 10}}"))[0]])`, hint: "Loop through world and print each place with its own danger and treasure, instead of typing them." },
    ],
  },
  // A member's name and stats don't have to share a line (fixture ALT_multi_line). Changed from also
  // wanting the defense values: the content's first hint prints only the attack (fixture adv_follows_hint).
  // As in ch7_r4, the answer line can come before a closing line (fixture r1_closing_line).
  ch7_r5: {
    output: [
      { expr: py`(lambda T: any(has('knight', '15', 'mage', '20', 'rogue', '12', L=T[:i]) and re.search(r'\bmage\b', T[i]) for i in {len(T) - 1, ${ANSWER_AT}(T, ['knight', 'mage', 'rogue'])} - {None}))([l.lower() for l in L])`, hint: "Print each member's stats, and then the name of the member with the highest attack: keep track of the best one so far as you compare." },
    ],
    probes: [
      // The first re-run party has 3 members with the best last. The prototype's had Rogue at index 1, where
      // Mage is in the task's party, so a typed party[1] passed (fixture wrong/typed_index). In the second,
      // the best comes first and two members beat 15, so keeping the last one over a fixed number fails
      // (wrong/adv_threshold_15). The weakest is in the middle, so comparing each member with the one before
      // it, instead of with the best so far, picks Rogue (wrong/r3_first_over_previous). Each re-run's attacks
      // must be listed before the answer (only attacks: the content's first hint prints no defense), so typed
      // stat lines next to a worked-out answer fail (wrong/r3_stats_typed_best_computed).
      { expr: py`all((lambda T: any(re.search(r'\b%s\b' % best, T[i]) for i in {len(T) - 1, ${ANSWER_AT}(T, ['knight', 'mage', 'rogue'])} - {None}))([l.lower() for l in rerun(${EVERY}('party', P))[0]]) for P, best, S in (("[{'name': 'Knight', 'attack': 31, 'defense': 1}, {'name': 'Mage', 'attack': 42, 'defense': 1}, {'name': 'Rogue', 'attack': 57, 'defense': 1}]", 'rogue', ('knight', '31', 'mage', '42', 'rogue', '57')), ("[{'name': 'Knight', 'attack': 57, 'defense': 1}, {'name': 'Mage', 'attack': 13, 'defense': 1}, {'name': 'Rogue', 'attack': 42, 'defense': 1}]", 'knight', ('knight', '57', 'mage', '13', 'rogue', '42'))))`, hint: "Find the member with the highest attack by comparing their attack values, then print that member's name." },
      // The same re-runs, now with the attacks listed before the answer: this says what's wrong when only that is.
      { expr: py`all((lambda T: any(re.search(r'\b%s\b' % best, T[i]) and has(*S, L=T[:i]) for i in {len(T) - 1, ${ANSWER_AT}(T, ['knight', 'mage', 'rogue'])} - {None}))([l.lower() for l in rerun(${EVERY}('party', P))[0]]) for P, best, S in (("[{'name': 'Knight', 'attack': 31, 'defense': 1}, {'name': 'Mage', 'attack': 42, 'defense': 1}, {'name': 'Rogue', 'attack': 57, 'defense': 1}]", 'rogue', ('knight', '31', 'mage', '42', 'rogue', '57')), ("[{'name': 'Knight', 'attack': 57, 'defense': 1}, {'name': 'Mage', 'attack': 13, 'defense': 1}, {'name': 'Rogue', 'attack': 42, 'defense': 1}]", 'knight', ('knight', '57', 'mage', '13', 'rogue', '42'))))`, hint: "Print each member's stats from the party list, like member['attack'], instead of typing them." },
    ],
  },
  // Each line can have a label before its value, like "Shield: None" (fixture adv_labels). The answers are
  // 3 lines in a row, so a heading can come first (fixture r1_header) and a closing line after them (fixture
  // r3_closing_line), or they share lines, as in one sentence (fixture m_cu1_one_sentence): see ANSWERS3.
  // They are found in any capitals first, so a near miss such as "Unarmed" gets a hint that names its line
  // (wrong/r3_capital_unarmed). When they aren't found, a key spelled differently,
  // such as "Name", is blamed first: hero.get("Name") gives None (wrong/r3_name_key_capital).
  ch7_s1: {
    output: [
      { expr: py`len(L) >= 3 or ${ANSWERS3}(L, ${CH7_S1_WORDS}, re.I) is not None`, hint: "Print all three lookups: the name, then the weapon, then the shield." },
      { expr: py`${ANSWERS3}(L, ${CH7_S1_WORDS}, re.I) is not None or not ${CH7_S1_BAD_KEYS}`, hint: "Check the spelling and capital letters of each key in hero.get(): a key is only found when it's written exactly as in the task, like \"name\"." },
      { expr: py`${ANSWERS3}(L, ${CH7_S1_WORDS}, re.I) is not None`, hint: "Print what the three hero.get() lookups give back, in the task's order: the name, then the weapon, then the shield." },
      { expr: py`lines(${CH7_S1_PATS}[:1], L=${ANSWERS3}(L, ${CH7_S1_WORDS}, re.I)[:1])`, hint: "So close! Check the capital letters of the name you print: it should show Aria just as it's written in hero." },
      { expr: py`lines(${CH7_S1_PATS}[1:2], L=${ANSWERS3}(L, ${CH7_S1_WORDS}, re.I)[1:2])`, hint: "So close! Check the capital letters of the weapon you print: the default should be unarmed, written just as in the task." },
      { expr: py`lines(${CH7_S1_PATS}[2:], L=${ANSWERS3}(L, ${CH7_S1_WORDS}, re.I)[2:])`, hint: "So close! Check the shield you print: it should be None, with a capital N, just as hero.get() gives it back." },
      { expr: py`${ANSWERS3}(L, ${CH7_S1_WORDS}) is not None`, hint: "Print what the three hero.get() lookups give back, in the task's order: the name, then the weapon, then the shield." },
    ],
    // Changed from calls('get') >= 3: hero.get("shield", "None") types the None in as a default
    // (wrong/adv_default_string_none). The weapon needs a default. The others don't, but one that changes
    // nothing is fine: hero.get("name", "nobody") prints Aria (fixture r2_name_default), and
    // hero.get("shield", None) gives the same None as no default (fixture r2_explicit_none_default).
    concepts: [{ expr: py`(lambda G: len(G) >= 3 and any(len(c.args) + len(c.keywords) == 2 for c in G) and not any(isinstance(d, ast.Constant) and isinstance(d.value, str) and d.value.strip() == 'None' for c in G for d in c.args[1:] + [k.value for k in c.keywords]))([n for n in ast.walk(TREE) if isinstance(n, ast.Call) and isinstance(n.func, ast.Attribute) and n.func.attr == 'get'])`, hint: "Use hero.get() for all three lookups, as the task shows: give the weapon the default \"unarmed\", and let the shield show the None that get() gives back by itself." }],
    probes: [
      // A key spelled differently, such as "Weapon" or "sheild", is never found, so the re-run below prints
      // the default instead (wrong/r2_capital_weapon_key, wrong/r2_sheild_typo): say so, instead of the
      // hint about typed answers. Keys are only blamed when the re-run fails.
      { expr: py`${CH7_S1_RERUN} or not ${CH7_S1_BAD_KEYS}`, hint: "Check the spelling and capital letters of each key in hero.get(): a key is only found when it's written exactly as in the task, like \"weapon\"." },
      // The re-run hero has a weapon and a shield, so a typed "unarmed" or "None" shows (wrong/adv_typed_none).
      { expr: py`${CH7_S1_RERUN}`, hint: "Print what hero.get() gives back each time, instead of typing the answers." },
    ],
  },
  ch7_s2: {
    output: [{ expr: py`${COUNT_LINES}(L, [('m', 1), ('i', 4), ('s', 4), ('p', 2)])`, hint: "Make your counts dictionary once, before the loop, and after counting print each letter once with its count." }],
    probes: [
      { expr: py`{'m': 1, 'i': 4, 's': 4, 'p': 2} in globals_of(dict)`, hint: "Count the letters in a dictionary: add 1 to a letter's count each time you see it." },
      // The re-run checks the printed counts too, not only the dict (wrong/adv_typed_output).
      { expr: py`(lambda t, r: {'b': 1, 'a': 3, 'n': 2} in [v for k, v in r.ns.items() if isinstance(v, dict) and not k.startswith('__')] and ${COUNT_LINES}(t, [('b', 1), ('a', 3), ('n', 2)]))(*rerun(${EVERY}('word', "'banana'")))`, hint: "Loop over the letters of word to build your counts, then print each letter and count from your dictionary, so it would work for any word." },
    ],
  },
  // As in ch5_s3, the task only says "Print both", so either can come first (fixture r2_lengths_first).
  // Each dictionary can be printed as it is, or one entry per line, as a loop over its items() prints
  // them, such as "2 cubed is 8" and "cat has 3 letters" (fixtures m_cu1_entry_sentences,
  // r4_one_dict_one_loop): see ENTRY_LINES.
  ch7_s3: {
    output: [{ expr: py`(has('{1: 1, 2: 8, 3: 27, 4: 64, 5: 125}') or ${ENTRY_LINES}(L, {1: 1, 2: 8, 3: 27, 4: 64, 5: 125})) and (has("{'cat': 3, 'elephant': 8, 'dog': 3}") or ${ENTRY_LINES}(L, {'cat': 3, 'elephant': 8, 'dog': 3}))`, hint: "Print both dictionaries, and check that cubes goes from 1 to 5, as range(1, 6) does, and that lengths has all three words." }],
    concepts: [
      { expr: py`count(ast.DictComp) >= 2`, hint: "Build both dictionaries with dict comprehensions: the one-line {key: value for ...} shorthand." },
      // As in ch5_s3, the values must be worked out in the comprehension, with math or a call such as
      // len(w): zip(words, [3, 8, 3]) types them in (wrong/adv_typed_lengths_zip).
      { expr: py`sum(isinstance(n, ast.DictComp) and any(isinstance(m, (ast.BinOp, ast.Call)) for m in ast.walk(n.value)) for n in ast.walk(TREE)) >= 2`, hint: "Work out each value inside your comprehension, like n**3 or the word's len(), instead of typing the numbers." },
    ],
    probes: [
      { expr: py`isinstance(ns.get('cubes'), dict) and isinstance(ns.get('lengths'), dict)`, hint: "Store your two dictionaries in variables named cubes and lengths, like the task shows." },
      // A dict printed one entry per line can pass the output with an extra entry after them, as
      // range(1, 7) gives (wrong/r4_sentences_range_1_7): this says what's wrong.
      { expr: py`ns.get('cubes') == {1: 1, 2: 8, 3: 27, 4: 64, 5: 125} and ns.get('lengths') == {'cat': 3, 'elephant': 8, 'dog': 3}`, hint: "Check your comprehensions: cubes should go from 1 to 5, as range(1, 6) does, and lengths should have all three words." },
      // As in ch5_s3, the printed dictionaries must be the variables, not typed copies (wrong/r3_typed_prints_after_build).
      { expr: py`(lambda t: (has('{7: 7}', L=t) or ${ENTRY_LINES}(t, {7: 7})) and (has("{'zz': 9}", L=t) or ${ENTRY_LINES}(t, {'zz': 9})))(rerun({'cubes': '{7: 7}', 'lengths': "{'zz': 9}"}, all=True)[0])`, hint: "Print the cubes and lengths dictionaries themselves, like print(cubes) or a loop over cubes.items(), instead of typing what's in them." },
    ],
  },
  // Changed from len(L) >= 4: a 3-line report (name and class, stats, inventory) is a correct answer
  // (fixture ALT_compact). 3 lines still rejects print(char), which isn't printing it nicely (wrong/raw_dict),
  // and the last probe rejects it with banner lines around it too.
  ch7_boss: {
    output: [{ expr: py`len(L) >= 3`, hint: "Call display_character with your character, and have it print the name and class, the stats and the inventory on lines of their own." }],
    probes: [
      { expr: py`any(isinstance(d.get('stats'), dict) and set(d['stats']) >= {'strength', 'speed', 'magic'} and isinstance(d.get('inventory'), list) and all(isinstance(x, str) for x in d['inventory']) and 'name' in d and 'char_class' in d for d in globals_of(dict))`, hint: "Make a character dictionary with name, char_class, a stats dictionary (strength, speed, magic) and an inventory list of item names." },
      { expr: py`sig('display_character') == (1, 0) and 'display_character' in trace`, hint: "Write display_character with one parameter for the character, and call it." },
      // The test character is a copy of the kid's own with new values, so extra keys such as a level are
      // still there for display_character to print (fixture adv_extra_level_field).
      // Compared in small letters, so a title printed with .upper(), like "ZED THE BARD", is fine (fixture
      // r2_upper_name_title).
      { expr: py`(lambda C: bool(C) and (lambda t: all(s in '\n'.join(t).lower() for s in ['zed', 'bard', '71', '72', '73', 'rope', 'lamp']))(callf('display_character', dict(C[0], name='Zed', char_class='Bard', stats=dict(C[0]['stats'], strength=71, speed=72, magic=73), inventory=['rope', 'lamp']))[1]))([d for d in globals_of(dict) if isinstance(d.get('stats'), dict) and 'name' in d and 'char_class' in d])`, hint: "display_character should print every detail of the character it is given: use its parameter, not your own variable." },
      // print(char) shows the whole dictionary as Python writes it, which isn't printing it nicely, and two
      // banner lines around it beat the output's 3 lines (wrong/r3_raw_dict_banner). A line holding the
      // character's own keys in quotes, as print(char) or print(char.items()) prints them, is that. Printing
      // the stats dictionary as it is, after a label, is fine.
      { expr: py`(lambda C: bool(C) and not any(re.search(r"['\"]char_class['\"]\s*[:,]", l) for l in callf('display_character', C[0])[1]))([d for d in globals_of(dict) if isinstance(d.get('stats'), dict) and 'name' in d and 'char_class' in d])`, hint: "Print the character's details one at a time, like its name and its class, instead of printing the whole dictionary at once." },
    ],
  },
  grind_12: {
    output: [{ expr: py`${COUNT_LINES}(L, [('the', 3), ('cat', 2), ('sat', 1), ('on', 1), ('mat', 1)])`, hint: "Split text into words, count each word in your dictionary, and then print each word once with its count." }],
    probes: [
      { expr: py`{'the': 3, 'cat': 2, 'sat': 1, 'on': 1, 'mat': 1} in globals_of(dict)`, hint: "Store the counts in a dictionary, with each word as a key and its count as the value." },
      // Changed from 'a b a': the re-run checks the printed counts too (wrong/adv_typed_output), and "a" is
      // inside "cat", so text.count(word) counts 3 of them (wrong/adv_substring_count).
      { expr: py`(lambda t, r: {'a': 2, 'cat': 1} in [v for k, v in r.ns.items() if isinstance(v, dict) and not k.startswith('__')] and ${COUNT_LINES}(t, [('a', 2), ('cat', 1)]))(*rerun(${EVERY}('text', "'a cat a'")))`, hint: "Split text into words and count each word in a loop, then print the counts from your dictionary, so it would work for any text." },
    ],
  },
  // The contact lines are the ones naming a contact and its phone, from the final dict or from the 3-contact
  // dict the program starts with, written out in braces or one contacts["Amy"] = "555-1111" line at a time
  // (fixture r3_built_by_assignment). The last len(d) of them must name each remaining contact once and
  // nothing else. So a title line is fine (fixture adv_header), and so are lines announcing the steps, even
  // with a phone in them, like "Added Dan (555-4444)" (fixtures r1_announce_with_phone, r1_announce_steps).
  // A list printed before the delete still names the deleted contact (wrong/r1_print_before_delete), and
  // so it does when the 3 contacts are made with dict(Amy="555-1111", ...) (wrong/r4_dict_call_print_before_delete).
  grind_13: {
    output: [{ expr: py`len(globals_of(dict)) >= 1 and (lambda d: (lambda A: (lambda C: (len(C) >= len(d) and (lambda P: all(len(p) == 1 and p[0] in d.items() for p in P) and sorted(repr(p[0]) for p in P) == sorted(map(repr, d.items())))([[kv for kv in A if str(kv[0]) in l and str(kv[1]) in l] for l in C[len(C) - len(d):]])) or (bool(C) and sorted(repr(kv) for kv in A if str(kv[0]) in C[-1] and str(kv[1]) in C[-1]) == sorted(map(repr, d.items()))))([l for l in L if any(str(k) in l and str(v) in l for k, v in A)]))(list(d.items()) + [kv for n in ast.walk(TREE) if isinstance(n, ast.Dict) and len(n.keys) == 3 and all(isinstance(x, ast.Constant) for x in n.keys + n.values) for kv in zip([x.value for x in n.keys], [x.value for x in n.values]) if kv not in d.items()] + [kv for n in ast.walk(TREE) if isinstance(n, ast.Assign) and isinstance(n.value, ast.Constant) for t in n.targets if isinstance(t, ast.Subscript) and isinstance(t.slice, ast.Constant) for kv in [(t.slice.value, n.value.value)] if kv not in d.items()] + [kv for n in ast.walk(TREE) if isinstance(n, ast.Call) and getattr(n.func, 'id', '') == 'dict' and len(n.keywords) == 3 and all(k.arg and isinstance(k.value, ast.Constant) for k in n.keywords) for kv in [(k.arg, k.value.value) for k in n.keywords] if kv not in d.items()]))(globals_of(dict)[0])`, hint: "Once you've added one contact and deleted one, print each contact that's left with its phone, using .items()." }],
    concepts: [
      // The 3 contacts can also be made with dict(), as in dict(Luna="111-2222", ...) (fixtures
      // m_cu1_dict_constructor, r4_dict_zip): see G13_DICT_CALL. Or they can be put in one at a time, as in
      // contacts = {} and then contacts["Amy"] = ... (fixture r3_built_by_assignment): then 3 or more keys,
      // counting a dict's own, are set before the first del or pop, and no dict starts with more than 3.
      { expr: py`any(isinstance(n, ast.Dict) and len(n.keys) == 3 for n in ast.walk(TREE)) or ${G13_DICT_CALL} or (not any(isinstance(n, ast.Dict) and len(n.keys) > 3 for n in ast.walk(TREE)) and (lambda cut: len({ast.unparse(t.slice) for n in ast.walk(TREE) if isinstance(n, ast.Assign) and n.lineno < cut for t in n.targets if isinstance(t, ast.Subscript)} | {ast.unparse(k) for n in ast.walk(TREE) if isinstance(n, ast.Dict) and n.lineno < cut for k in n.keys if k is not None}) >= 3)(min([n.lineno for n in ast.walk(TREE) if isinstance(n, ast.Delete) or (isinstance(n, ast.Call) and getattr(n.func, 'attr', None) == 'pop')] or [10 ** 9])))`, hint: "Start with a dictionary that has 3 contacts in it, each one a name: phone pair." },
      // The task only says "add one", so .update() and .setdefault() count too (fixture ALT_update).
      { expr: py`any(isinstance(n, ast.Assign) and isinstance(n.targets[0], ast.Subscript) for n in ast.walk(TREE)) or calls('update') >= 1 or calls('setdefault') >= 1`, hint: "Add one new contact to your dictionary, for example with your_dict[name] = phone." },
      { expr: py`count(ast.Delete) >= 1 or calls('pop') >= 1`, hint: "Delete one contact with del or .pop()." },
      // As in ch7_r3, a bare .items() call doesn't count, and neither does a loop over it that does nothing,
      // next to typed-in contacts (wrong/adv_typed_after_loop): its body has to call something, such as print()
      // or a function of the kid's (fixture adv_show_function). A print() of what .items() gives back counts.
      { expr: py`any(isinstance(n, ast.For) and any(isinstance(c, ast.Call) and getattr(c.func, 'attr', None) == 'items' for c in ast.walk(n.iter)) and any(isinstance(c, ast.Call) for st in n.body for c in ast.walk(st)) for n in ast.walk(TREE)) or any(isinstance(n, (ast.ListComp, ast.GeneratorExp, ast.SetComp)) and any(isinstance(c, ast.Call) and getattr(c.func, 'attr', None) == 'items' for g in n.generators for c in ast.walk(g.iter)) and any(isinstance(c, ast.Call) for c in ast.walk(n.elt)) for n in ast.walk(TREE)) or any(isinstance(c, ast.Call) and getattr(c.func, 'id', '') == 'print' and any(isinstance(m, ast.Call) and getattr(m.func, 'attr', None) == 'items' for a in c.args for m in ast.walk(a)) for c in ast.walk(TREE))`, hint: "Print the remaining contacts with .items(), as the task asks: loop over it, or print what it gives back." },
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
  // - the three results are found by what the lines hold (CH8_R1), not by being lines 1, 2 and 3, and they
  //   can share lines;
  // - the item has to come from random.choice(), which the choice probe already needed. As a concept it
  //   comes first, so items[random.randint(0, 2)] is told about choice(), not about the die's randint(1, 6).
  // The task only says to print a random number from 1 to 6, so the die can be rolled with
  // random.randint(1, 6), random.randrange(1, 7) (fixture r1_randrange_die), random.choice([1, 2, 3, 4, 5, 6])
  // (fixture r1_choice_for_die), or randint(0, 5) + 1. DIE_PATCH(v) makes each of them give the v-th smallest
  // value it can, so all of those roll a v, while randint(0, 5) with no + 1 rolls v - 1 (wrong/adv_randint_0_5).
  // Each probe patches in two values, not one: seed 0 rolls a 4, so a typed print(4) matched the one patched
  // value (wrong/fixed_die), and one value is always matchable by typing it. The die's range must hold 6
  // values: at seed 0, randint(1, 7) rolls a number from 1 to 6 too (wrong/r1_randint_1_7).
  ch8_r1: {
    output: [{ expr: py`(lambda r, it, lst: r is not None and lst is not None and any(1 <= i <= 6 for i in ints(r)) and sorted(ast.literal_eval(re.search(r'\[.*\]', lst).group())) == [1, 2, 3, 4, 5])(*${CH8_R1}(L))`, hint: "Print the three results in the task's order: a dice roll from 1 to 6, the random item, and then your list itself after you shuffle it." }],
    concepts: [{ expr: py`calls('choice') >= 1`, hint: "Pick the item with random.choice(): give it the list and it picks one thing for you." }],
    probes: [
      { expr: py`all(v in ints(${CH8_R1}(rerun(patches=${DIE_PATCH}(v))[0])[0] or '') for v in (2, 5))`, hint: "Roll the die with random.randint(1, 6) and print what it gives you." },
      { expr: py`(lambda a, b: (rerun(patches={'random.randint': a[0], 'random.randrange': b[0]}), all(len(c) != 2 or c[1] - c[0] == 5 for c in a[1]) and all(not (1 <= len(c) <= 3 and all(type(x) is int for x in c)) or len(range(*c)) == 6 for c in b[1]))[1])(rec('random.randint'), rec('random.randrange'))`, hint: "A die has 6 sides, so roll it with random.randint(1, 6): that gives a number from 1 to 6." },
      // choice() gives v only when the list holds it, so a list that leaves an item out, such as
      // ["sword", "shield"], fails (wrong/r2_two_items_list).
      { expr: py`all(v in (${CH8_R1}(rerun(patches={'random.choice': lambda s, v=v: v if v in s else s[0]})[0])[1] or '') for v in ('potion', 'sword'))`, hint: "Pick the item with random.choice() from the task's list of all three items, and print what it gives you." },
      { expr: py`all(s in (${CH8_R1}(rerun(patches={'random.shuffle': f})[0])[2] or '') for f, s in ((lambda x: x.reverse(), '[5, 4, 3, 2, 1]'), (lambda x: x.append(x.pop(0)), '[2, 3, 4, 5, 1]')))`, hint: "Shuffle your list with random.shuffle(), then print the list itself." },
    ],
  },
  // The startswith answer is read as a yes or a no from the last line that reads as one, so "Yes, it starts
  // with the" works as well as True (fixture adv_if_yes), and a closing line such as "All done!" after it is
  // fine (fixture r1_closing_line). The prototype wanted a True after the joined words, on the last line.
  // The re-run sentence has "the" later on, so "the" in clean, which is True for it, fails
  // (wrong/adv_in_not_startswith). The prototype's '  hello big world ' had no "the" at all.
  // A line that says it starts or begins with something, and doesn't say not, is a yes too, as in
  // "It starts with 'the'!" (fixture r2_starts_message_no_yes): see STARTS.
  ch8_r2: {
    output: [{ expr: py`has('6', 'the - quick - brown - fox - jumps - over') and [p for p in map(${STARTS}, L) if p][-1:] == [1]`, hint: "Strip the sentence first, then print how many words it has, the words joined with \" - \", and whether it starts with \"the\"." }],
    probes: [
      { expr: py`(lambda t: has('3', 'hello - the - world', L=t) and [p for p in map(${STARTS}, t) if p][-1:] == [-1])(rerun(${EVERY}('sentence', "'  hello the world '"))[0])`, hint: "Get each answer from sentence with strip(), split(), len(), join() and startswith(), so they'd change for a different sentence." },
    ],
  },
  // Changed from exactly 3 lines: a line before each test is fine (fixture adv_announce_each).
  ch8_r3: {
    output: [{ expr: py`len([l for l in L if l.strip()]) >= 3`, hint: "Write all three try/except blocks and print a message in each except, so three messages show up." }],
    concepts: [
      { expr: py`count(ast.Try) >= 3`, hint: "Write three separate try/except blocks, one for each error." },
      { expr: py`{'ValueError', 'ZeroDivisionError', 'KeyError'} <= {h.type.id for h in ast.walk(TREE) if isinstance(h, ast.ExceptHandler) and isinstance(h.type, ast.Name)}`, hint: "Name the error in each except: ValueError, ZeroDivisionError and KeyError." },
      // The message has to be printed inside each except, by print() or a function of the kid's: except
      // blocks that only pass, next to messages printed after each try (wrong/r1_prints_outside_except) or
      // inside it (wrong/r1_messages_in_try), print nothing when the error is caught. print(e) is fine
      // (fixture r1_only_error_object).
      { expr: py`all(any(isinstance(h.type, ast.Name) and h.type.id == e and any(isinstance(c, ast.Call) and getattr(c.func, 'id', '') in {'print'} | {f.name for f in fdef()} for st in h.body for c in ast.walk(st)) for h in ast.walk(TREE) if isinstance(h, ast.ExceptHandler)) for e in ('ValueError', 'ZeroDivisionError', 'KeyError'))`, hint: "Put a print() with a helpful message inside each except block, so it shows up when that error is caught." },
      // A try block that raises the error itself, as in raise ValueError("bad"), never runs the task's risky
      // code (wrong/r3_raise_manually).
      { expr: py`not any(isinstance(n, ast.Try) and any(isinstance(h.type, ast.Name) and h.type.id in ('ValueError', 'ZeroDivisionError', 'KeyError') for h in n.handlers) and any(isinstance(m, ast.Raise) for st in n.body for m in ast.walk(st)) for n in ast.walk(TREE))`, hint: "Let Python raise each error by itself: in each try, run the risky code from the task, like int(\"hello\"), instead of using raise." },
    ],
    probes: [
      // Each except block's message must show up, so the error really happened. Try blocks around int("5")
      // or 10 / 2 never reach their except (wrong/adv_no_errors_raised). The message is the longest piece
      // of text in the block's print() calls, leaving out {...} and %s parts; a block with no text is skipped.
      // A message that several blocks share must show up once for each of them: otherwise one block that
      // really catches its error covers for the others (wrong/adv_get_same_message, adv_same_message_one_safe).
      { expr: py`(lambda H: len(H) >= 3 and (lambda M: all(m is None or out.count(m) >= M.count(m) for m in M))([(lambda cs: max(cs, key=len) if cs else None)([p.strip().replace('️', '') for st in h.body for c in ast.walk(st) if isinstance(c, ast.Call) and getattr(c.func, 'id', '') == 'print' for s in ast.walk(c) if isinstance(s, ast.Constant) and isinstance(s.value, str) for p in re.split(r'\{[^{}]*\}|%\S', s.value) if p.strip()]) for h in H]))([h for h in ast.walk(TREE) if isinstance(h, ast.ExceptHandler) and isinstance(h.type, ast.Name) and h.type.id in ('ValueError', 'ZeroDivisionError', 'KeyError')])`, hint: "Each try should run the risky code from the task, like int(\"hello\"), so the error really happens and your except block prints its message." },
    ],
  },
  // The answer line only has to name Sam: "print the highest scorer" doesn't ask for the score
  // (fixture ALT_name_only). The prototype also wanted 92 on it. The records don't need a line each:
  // print(records) prints them all (fixture ALT_print_records). The answer is the last line, or the last
  // line that names just one of the four, so a closing line after it is fine (fixture r1_closing_line). The
  // names are matched with their capitals, so "Max score" in an answer line doesn't name Max.
  // The records can be printed in any order, such as ranked by score (fixture r2_sorted_leaderboard): each
  // name must be followed by its score, with no other name between them.
  ch8_r4: {
    output: [{ expr: py`any((lambda T: all(re.search(r'\b%s\b(?:(?!\b(?:Alex|Sam|Jo|Max)\b).)*?(?<![\d.])%s(?![\d.])' % r, T, re.S) for r in (('Alex', '85'), ('Sam', '92'), ('Jo', '78'), ('Max', '88'))))('\n'.join(L[:i])) and 'Sam' in L[i] for i in {len(L) - 1, ${ANSWER_AT}(L, ['Alex', 'Sam', 'Jo', 'Max'])} - {None})`, hint: "Print every record, each name with its score, and then, after them, the name of the highest scorer." }],
    probes: [
      { expr: py`ns.get('records') == [{'name': 'Alex', 'score': 85}, {'name': 'Sam', 'score': 92}, {'name': 'Jo', 'score': 78}, {'name': 'Max', 'score': 88}]`, hint: "Store each record in records as a dictionary with a name and a score, and turn the score into a number with int()." },
      // Bob is first in the re-run data. The prototype's 'Ann,1\nBob,5' put him at index 1, where Sam
      // is in the task's data, so a typed records[1] passed (fixture wrong/typed_index). He isn't last
      // either: nobody beats 90 in it, so a program that prints only a score over 90 ends on the last
      // record's line (wrong/adv_threshold_90), which would name Bob if he were last. In the second re-run
      // Bob is in the middle, so keeping the first record unless a score beats a fixed number fails
      // (wrong/r2_best_first_over_80). In the third, the scores have different numbers of digits, so comparing
      // them as text picks Ann (wrong/r3_string_compare_scores). Each re-run's records must be shown, each name
      // followed by its score, before the answer, so typed record lines next to a worked-out answer fail
      // (wrong/r3_typed_records_computed_best).
      { expr: py`all((lambda T: any('Bob' in T[i] for i in {len(T) - 1, ${ANSWER_AT}(T, ['Bob', 'Ann', 'Cy'])} - {None}))(rerun(${EVERY}('data', D))[0]) for D in ("'Bob,5\\nAnn,1\\nCy,2'", "'Ann,1\\nBob,5\\nCy,2'", "'Ann,9\\nBob,10\\nCy,2'"))`, hint: "Find the highest scorer by comparing the scores in records, so it would work for any data." },
      // The same re-runs, now with every record shown before the answer: this says what's wrong when only that is.
      { expr: py`all((lambda T: any('Bob' in T[i] and all(re.search(r'\b%s\b(?:(?!\b(?:Bob|Ann|Cy)\b).)*?(?<![\d.])%s(?![\d.])' % tuple(p.split(',')), '\n'.join(T[:i]), re.S) for p in ast.literal_eval(D).split('\n')) for i in {len(T) - 1, ${ANSWER_AT}(T, ['Bob', 'Ann', 'Cy'])} - {None}))(rerun(${EVERY}('data', D))[0]) for D in ("'Bob,5\\nAnn,1\\nCy,2'", "'Ann,1\\nBob,5\\nCy,2'", "'Ann,9\\nBob,10\\nCy,2'"))`, hint: "Print all the records from your records list, each name with its score, instead of typing them." },
    ],
  },
  // The prototype called val('add_item')(inv, ...), which runs the kid's function outside the hidden-run
  // time limit and doesn't put builtins back afterwards. callf does both, so every call goes through it.
  ch8_r5: {
    output: [{ expr: py`len(L) >= 4`, hint: "Add 3 items, call display so it prints each one, and then print what find_item gives back when you search for one." }],
    probes: [
      { expr: py`(lambda inv: (callf('add_item', inv, 'Zed', 42), len(inv) == 1 and isinstance(inv[0], dict) and 'Zed' in inv[0].values() and 42 in inv[0].values())[1])([])`, hint: "add_item should add one dictionary, holding the item's name and quantity, to the end of the list it is given." },
      // Searches for the second of two items: an else: return None inside the loop gives up after the first
      // item (wrong/adv_early_return_none).
      { expr: py`(lambda inv: (callf('add_item', inv, 'Zed', 42), callf('add_item', inv, 'Yan', 7), callf('find_item', inv, 'Yan')[0] is inv[1] and callf('find_item', inv, 'Zed')[0] is inv[0] and callf('find_item', inv, 'nope')[0] is None)[2])([])`, hint: "find_item should check every item and return the matching item's dictionary, or None when nothing matches." },
      // Other lines, such as a title, are fine (fixture adv_display_header): one line has to show Zed, a later
      // one Yan, and no line both, with 42 shown from Zed's line up to Yan's. So the quantity can have a line
      // of its own under the name (fixture r2_display_two_lines).
      { expr: py`(lambda inv: (callf('add_item', inv, 'Zed', 42), callf('add_item', inv, 'Yan', 7), (lambda t: any('Zed' in a and 'Yan' in t[j] and re.search(r'(?<![\d.])42(?![\d.])', '\n'.join(t[i:j])) for i, a in enumerate(t) for j in range(i + 1, len(t))) and not any('Zed' in l and 'Yan' in l for l in t))(callf('display', inv)[1]))[2])([])`, hint: "display should loop over the list it is given and print each item's name and quantity." },
      { expr: py`trace.count('add_item') >= 3 and 'display' in trace and 'find_item' in trace`, hint: "Your program should call add_item 3 times, then display, then find_item." },
    ],
  },
  // Added a re-run probe: output checks alone passed the table typed out in five prints (fixture
  // wrong/hardcoded). The alignment check gets its own hint, because the default one says the output
  // doesn't match when only the spacing is off.
  // Spaces between the $ and the price are fine: the content's first hint used to be ${price:>6.2f}, which
  // prints "$ 29.99" (fixture adv_follows_hint), and the alignment check still applies. The hint now makes
  // the "$29.99" text first and right-aligns that, which prints the task's table (fixture r4_follows_new_hint).
  // Changed from exactly the 5 table lines: the table is the 5 lines from its Item header on (CH8_S1_TABLE),
  // so a title line before it, such as "Welcome to the shop!" (fixture r3_title_line), is fine, as in the
  // other rooms, and so is a closing line after it. Each table line is checked on its own, with a hint that
  // names it, since a lines() check on part of the output can't name the line that differs.
  ch8_s1: {
    output: [
      { expr: py`sum(bool(re.match(r'(?i)\s*item\b', l)) for l in L) <= 1`, hint: "Print the Item and Price header just once, before your loop, then one line for each item." },
      { expr: py`len(${CH8_S1_TABLE}(L)) == 5`, hint: "Your table needs 5 lines: the Item and Price header, a line of dashes, then one line for each of the 3 items." },
      { expr: py`re.fullmatch(r'Item\s+Price', ${CH8_S1_TABLE}(L)[0]) is not None`, hint: "Check your header line: it should say Item, then some spaces, then Price, with the same capital letters as the task's table." },
      { expr: py`re.fullmatch(r'-{5,}', ${CH8_S1_TABLE}(L)[1]) is not None`, hint: "Under the header, print a line of dashes and nothing else, like the one in the task's table." },
      { expr: py`re.fullmatch(r'Sword\s+\$\s*29\.99', ${CH8_S1_TABLE}(L)[2]) is not None`, hint: "Check your Sword line: it should show Sword, then some spaces, then its price with a $ and 2 decimal places, as in the task's table." },
      { expr: py`re.fullmatch(r'Shield\s+\$\s*15\.50', ${CH8_S1_TABLE}(L)[3]) is not None`, hint: "Check your Shield line: it should show Shield, then some spaces, then its price with a $ and 2 decimal places, as in the task's table." },
      { expr: py`re.fullmatch(r'Potion\s+\$\s*3\.00', ${CH8_S1_TABLE}(L)[4]) is not None`, hint: "Check your Potion line: it should show Potion, then some spaces, then its price with a $ and 2 decimal places, as in the task's table." },
      { expr: py`len({len(l) for l in ${CH8_S1_TABLE}(L)[2:]}) == 1`, hint: "So close! Line up the prices so they all end in the same column, like the table in the task." },
    ],
    probes: [
      // The re-run's table has one row, Axe, and no other row with a price after it (a typed Sword row
      // would come before it anyway).
      { expr: py`(lambda t: len(t) >= 3 and re.fullmatch(r'Axe\s+\$\s*5\.50', t[2]) is not None and not any(re.search(r'\$\s*\d', l) for l in t[3:]))(${CH8_S1_FROM}(rerun(${EVERY}('items', "[('Axe', 5.5)]"))[0]))`, hint: "Print the rows by looping over the items list, so the table would change if the items did." },
    ],
  },
  // banana and cherry both have 6 letters, so either order is sorted by length. A kid who sorts words in
  // place first gets banana before cherry (fixture ALT_sort_in_place); the prototype only took cherry first.
  ch8_s2: {
    output: [{ expr: py`has("['apple', 'banana', 'cherry']", "['apple', 'cherry', 'banana']") or has("['apple', 'banana', 'cherry']", "['apple', 'banana', 'cherry']")`, hint: "Print words sorted two ways: alphabetically with sorted(words), and by length with sorted() and a lambda." }],
    concepts: [{ expr: py`any(isinstance(n, ast.Call) and getattr(n.func, 'id', '') == 'sorted' and any(k.arg == 'key' and isinstance(k.value, ast.Lambda) for k in n.keywords) for n in ast.walk(TREE))`, hint: "For the length sort, use sorted() with key= and a lambda, as the task asks." }],
    probes: [
      { expr: py`getattr(ns.get('double'), '__name__', '') == '<lambda>' and val('double(7)') == 14`, hint: "Make double with lambda (not def), so that double(7) gives back 14." },
      // The test is on a line that doesn't name a fruit, before or after the sorted lists (fixture
      // r1_test_after_sorts). print(double) prints "<function <lambda> at 0x...>", whose address has digits
      // (wrong/adv_prints_function). A test that prints True or False, as print(double(5) == 10) does, is
      // fine (fixture r2_test_equality_true): the next probe checks that it comes from double.
      { expr: py`any(re.search(r'-?\d|\b(True|False)\b', l) and '<function' not in l for l in L if not re.search(r'apple|banana|cherry', l))`, hint: "Test your lambda: print what double gives back for a number, like print(double(5))." },
      // With a different double, the test line must change, so a typed print(10) fails (wrong/typed_double_test).
      // The + 1 changes double(0) too.
      { expr: py`(lambda T: T(L) != T(rerun({'double': 'lambda x: x * 2 + 1'})[0]))(lambda t: [l for l in t if not re.search(r'apple|banana|cherry', l)])`, hint: "Print what double gives back, like print(double(5)), instead of typing the answer." },
      // A re-run with words that have no ties, so sorting alphabetically and by length give different lists:
      // key=lambda w: w passed the main run (wrong/adv_key_identity), and so did typed lists next to a sorted()
      // call whose answer was thrown away (wrong/adv_typed_lists).
      { expr: py`has("['banana', 'fig', 'kiwi']", "['fig', 'kiwi', 'banana']", L=rerun(${EVERY}('words', "['kiwi', 'fig', 'banana']"))[0])`, hint: "Print what sorted() gives back for words, once alphabetically and once with key=lambda w: len(w), so your lists would change if the words did." },
      // Two words that start with the same letter, in the wrong order: sorting by the first letter only, as
      // key=lambda w: w[0] does, keeps bean before banana (wrong/r3_first_letter_key). kiwi and bean both have 4
      // letters, so either can come first in the length sort, as sorting words in place first gives
      // (fixture ALT_sort_in_place).
      { expr: py`(lambda t: any(has("['banana', 'bean', 'fig', 'kiwi']", b, L=t) for b in ("['fig', 'kiwi', 'bean', 'banana']", "['fig', 'bean', 'kiwi', 'banana']")))(rerun(${EVERY}('words', "['kiwi', 'fig', 'bean', 'banana']"))[0])`, hint: "For the alphabetical sort, use sorted(words) with no key: it compares whole words, not just their first letters." },
    ],
  },
  // The three sorted orders are 9 names in a row among the names printed, so the list can be printed
  // before it is sorted too (fixture r2_original_first).
  ch8_s3: {
    output: [{ expr: py`${IN_A_ROW}(re.findall(r'\b(Knight|Mage|Rogue)\b', out), ['Mage', 'Knight', 'Rogue', 'Mage', 'Knight', 'Rogue', 'Knight', 'Mage', 'Rogue'])`, hint: "Print the heroes sorted three ways, in the task's order: by power from highest to lowest, by speed from lowest, and then by name." }],
    probes: [
      { expr: py`${IN_A_ROW}(re.findall(r'\b(Zed|Yan|Xia)\b', '\n'.join(rerun(${EVERY}('heroes', "[{'name': 'Zed', 'power': 1, 'speed': 1}, {'name': 'Yan', 'power': 2, 'speed': 3}, {'name': 'Xia', 'power': 3, 'speed': 2}]"))[0])), ['Xia', 'Yan', 'Zed', 'Zed', 'Xia', 'Yan', 'Xia', 'Yan', 'Zed'])`, hint: "Sort heroes three times with sorted(), each with its own key: power (highest first), speed (lowest first), then name." },
    ],
  },
  // content bug: the room's first hint puts def check_guess(g, s): if ... elif ... else ... on one line, which
  // is a SyntaxError if a kid copies it.
  // The secret is never seeded by the kid, so the probes patch random.randint to pick it. Grading seeds
  // random with 0, which makes the main run's secret 13: all 4 guesses get used.
  // The task says to loop through the guesses, and never says to stop at the correct one, so a loop that
  // stops there with break and one that checks every guess are both fine (fixtures m_ct2_no_break_stats,
  // m_d_hint_loop_no_break, no_break, no_break_result_only; the last two were wrong fixtures while a break
  // was wanted). So the attempts are 3 or 4 with the secret 7, depending on the loop. The re-run with
  // the guesses [2, 19, 13] and the secret 13 puts the correct guess last, so there both loops use all 3
  // guesses, and the attempts are 3 whichever loop it is: that re-run is what tells a real count from a
  // typed one when the loop doesn't stop.
  // Changed from the prototype:
  // - with the secret 7, only the first 3 results are read: high, high, correct. What comes after them is
  //   free, so a summary line such as "You got it correct in 3 attempts!" (fixture ALT_result_summary),
  //   which the prototype's [:4] == [3 results] failed, and stats such as "too high: 2, too low: 0"
  //   (fixture ALT_stats_summary) are fine.
  // - the attempts dict can also hold one entry per attempt, like {1: 'low', 2: 'high', ...}
  //   (fixture ALT_history_dict), not only a count of 4. It is read from ns, the globals as the main run
  //   left them: the first probe calls check_guess, which can count attempts too (fixture
  //   ALT_count_in_check_guess), and globals_of() would see those calls. The same dict must then hold 3
  //   (or 3 entries) after the secret-7 re-run, or after the [2, 19, 13] one, so a typed
  //   stats = {"attempts": 4} fails (wrong/adv_typed_stats, wrong/r4_no_break_stats_typed_dict), and so
  //   does a plain attempts variable (wrong/m_wt2_no_dict_no_break), whose hint is now about the dict, not
  //   about break.
  // - the re-runs' randint gives the secret on its first call and 1 after that, so picking a new secret
  //   for every guess fails (wrong/adv_secret_in_loop);
  // - the results are read with RESULTS, which also takes "You got it!".
  ch8_boss: {
    output: [{ expr: py`len([l for l in L if re.search(r'(?i)high|low|correct', l)]) >= 1`, hint: "Print the result of each guess: the \"high\", \"low\" or \"correct\" that check_guess gives back." }],
    probes: [
      { expr: py`[val('check_guess(%d, 3)' % g) for g in (5, 1, 3)] == ['high', 'low', 'correct']`, hint: "check_guess should return \"high\", \"low\" or \"correct\" by comparing the guess with the secret." },
      // The re-runs patch randint to pick the secret, so its range is read from the calls instead:
      // randint(1, 100) or randint(1, 10) passed or failed only by the seed's luck (wrong/r2_randint_1_100,
      // wrong/r2_randint_1_10). A call with keywords isn't recorded with its numbers, so it is left alone.
      // The task names random.randint(1, 20), and the re-runs below only patch randint, so a secret picked
      // with randrange() or choice(), or typed in, fails here with this hint (wrong/r3_secret_1_to_20_exclusive,
      // which can never pick 20): the later hints, about the loop, didn't fit it.
      { expr: py`(lambda w: (rerun(patches={'random.randint': w[0]}), bool(w[1]) and all(len(c) != 2 or tuple(c) == (1, 20) for c in w[1]))[1])(rec('random.randint'))`, hint: "The task says to pick the secret with random.randint(1, 20), so it can be any number from 1 to 20." },
      // With the secret 13 every guess is used, so check_guess must run 4 times: a game loop that compares
      // the guesses itself, leaving check_guess unused, passed without this (wrong/adv_check_guess_unused).
      { expr: py`rerun(patches={'random.randint': seq([13, 1, 1, 1])})[1].trace.count('check_guess') >= 4`, hint: "Use check_guess in your game loop: call it for each guess, and use what it gives back to print the result." },
      // Calling check_guess on a line by itself and printing results from the loop's own comparisons passed
      // the count above (wrong/r1_check_guess_ignored).
      { expr: py`${USES_ANSWER}('check_guess', 5, 3)`, hint: "Use what check_guess gives back: store it, like result = check_guess(guess, secret), and print the result from it." },
      { expr: py`${RESULTS}(rerun(patches={'random.randint': seq([13, 1, 1, 1])})[0])[:4] == ['low', 'high', 'low', 'correct']`, hint: "Pick the secret once with random.randint(1, 20), before the loop, then check every guess against it with check_guess and print each result." },
      { expr: py`${RESULTS}(rerun(patches={'random.randint': seq([7, 1, 1, 1])})[0])[:3] == ['high', 'high', 'correct']`, hint: "Check every guess against the secret with check_guess and print each result, so the results change when the secret does." },
      { expr: py`(lambda R: any(isinstance(d, dict) and any(isinstance(r.ns.get(k), dict) and (any(d.get(j) == 4 and r.ns[k].get(j) == 3 for j in d) or len(d) == 4 and len(r.ns[k]) == 3) for r in R) for k, d in ns.items() if not k.startswith('__')))([rerun(patches={'random.randint': seq([7, 1, 1, 1])})[1], rerun(${CH8_BOSS_LAST_RIGHT}, patches={'random.randint': seq([13, 1, 1, 1])})[1]])`, hint: "Keep track of the attempts in a dictionary, like stats = {\"attempts\": 0}, and add 1 to it for each guess." },
      // Step 5 prints the stats: the attempts count, 4 with the secret 13, must show once the correct guess
      // is found (STATS_SHOWN), and so must 3 with the secret 7 or with the guesses [2, 19, 13]. Stats that
      // are kept but never printed (wrong/r2_no_stats_printed), or a typed print("Attempts: 4")
      // (wrong/r2_typed_stats_print, wrong/r4_no_break_typed_attempts), passed the dict check above.
      { expr: py`${STATS_SHOWN}(rerun(patches={'random.randint': seq([13, 1, 1, 1])})[0], 4) and (${STATS_SHOWN}(rerun(patches={'random.randint': seq([7, 1, 1, 1])})[0], 3) or ${STATS_SHOWN}(rerun(${CH8_BOSS_LAST_RIGHT}, patches={'random.randint': seq([13, 1, 1, 1])})[0], 3))`, hint: "After the game, print the stats from your dictionary, like how many attempts it took, so they change when the game does." },
    ],
  },
  // len(L) >= 2, not == 2: a safe_divide that prints its own warning and returns None prints 3 lines
  // (fixture ALT_prints_message). The task doesn't say what to give back for b = 0, so returning 0 is
  // fine (fixture ALT_return_zero; the prototype wanted a message), and 10 / 3 can print rounded
  // (fixture ALT_rounded). The probes check the function itself. The 10 / 3 answer can be on any line,
  // after a title line say (fixture adv_header), and the (10, 0) test can come first (fixture
  // r1_zero_test_first); the prototype wanted the 10 / 3 answer first.
  grind_14: {
    output: [{ expr: py`len(L) >= 2 and nums_approx([10/3], tol=0.05)`, hint: "Print what safe_divide gives back when you test it with (10, 3) and with (10, 0)." }],
    concepts: [{ expr: py`count(ast.Try) >= 1`, hint: "Use try: and except: inside safe_divide to catch the divide-by-zero error." }],
    probes: [
      { expr: py`val('safe_divide(10, 4)') == 2.5`, hint: "safe_divide should return a / b when b isn't zero." },
      { expr: py`not (isinstance(val('safe_divide(1, 0)'), tuple) and val('safe_divide(1, 0)')[:1] == ('__error__',))`, hint: "Put the try/except inside safe_divide, so calling it with b = 0 never crashes." },
      // A correct safe_divide that is never called, next to typed answers, passed without this
      // (wrong/adv_typed_first), and so did answers stored and never used (wrong/adv_stored_typed_prints,
      // adv_tuple_stored_typed). A safe_divide that prints its own warning for b = 0 can be called on a line
      // by itself (USES_ANSWER).
      { expr: py`trace.count('safe_divide') >= 2 and ${USES_ANSWER}('safe_divide', 1, 0, loose=True)`, hint: "Test your function: print what safe_divide(10, 3) and safe_divide(10, 0) give back." },
      // Two tests without a zero, such as (10, 3) and (10, 2), passed the count above (wrong/r1_no_zero_test).
      // One safe_divide call has to have a typed 0 for b. A b worked out in the program, such as a loop's
      // variable, can't be read, so then a typed 0 anywhere outside safe_divide will do (fixture r1_loop_pairs).
      { expr: py`(lambda X, inside: any(isinstance(x, ast.Constant) and x.value == 0 for x in X) or (any(not isinstance(x, ast.Constant) for x in X) and any(isinstance(n, ast.Constant) and type(n.value) in (int, float) and n.value == 0 and id(n) not in inside for n in ast.walk(TREE))))([x for c in ast.walk(TREE) if isinstance(c, ast.Call) and getattr(c.func, 'id', '') == 'safe_divide' for x in c.args[1:2] + [k.value for k in c.keywords]], {id(m) for f in fdef('safe_divide') for m in ast.walk(f)})`, hint: "The task says to test with (10, 0) too: call safe_divide(10, 0) and print what it gives back." },
    ],
  },
  // The rolls are the lines before the summary that hold 2 or more numbers, not simply the first 10 lines,
  // so an extra "Doubles!" line after a roll is fine (fixture ALT_doubles_line; seed 0 rolls doubles first),
  // and so is a heading (fixtures r1_header_comma, r1_header_no_comma) or a closing line (fixture
  // r1_closing_line): see ROLLS. A roll's dice are its last 2 numbers once DICE drops labels, so
  // "Die 1: 3, Die 2: 5" is a 3 and a 5 (fixture ALT_die_labels). The count is the last number on the summary
  // line once DOUBLES drops a total or a share, as in "Doubles: 2 out of 10".
  grind_15: {
    output: [
      { expr: py`(lambda s, r: s is not None and len(r) == 10 and all(1 <= d <= 6 for l in r for d in ${DICE}(l)[-2:]))(*${ROLLS}(L))`, hint: "Roll both dice 10 times in a loop, print each roll with both dice, and then print how many doubles you got." },
      { expr: py`(lambda s, r: s is not None and ${DOUBLES}(s)[-1:] == [sum(1 for l in r if ${DICE}(l)[-2] == ${DICE}(l)[-1])])(*${ROLLS}(L))`, hint: "Start your doubles count at 0 before the loop, add 1 only when both dice match, and print the count after all 10 rolls." },
    ],
    probes: [
      { expr: py`${DOUBLES}(${ROLLS}(${DICE_RERUN}(lambda *a, **k: 3)[0])[0] or '')[-1:] == [10]`, hint: "Roll both dice with random.randint inside your loop, and add 1 to your count every time they match." },
      { expr: py`${DOUBLES}(${ROLLS}(${DICE_RERUN}(seq([1, 2]))[0])[0] or '')[-1:] == [0]`, hint: "Only count a roll as doubles when both dice show the same number." },
      // With the dice rolling 1 1, 1 2, 1 1, ... half the rolls are doubles, but dice rolled once before the
      // loop show 1 1 every time (wrong/r2_roll_outside_loop): the two probes above give the same count
      // either way.
      { expr: py`${DOUBLES}(${ROLLS}(${DICE_RERUN}(seq([1, 1, 1, 2]))[0])[0] or '')[-1:] == [5]`, hint: "Roll both dice inside your loop, so each of the 10 rolls gets new numbers." },
      // As in ch8_r1, the dice's range is read from the calls: randint(1, 5) never rolls a 6, and seed 0 hides
      // that (wrong/r2_randint_1_5). So are randrange(1, 7)'s and choice()'s: each must have 6 values to pick from.
      { expr: py`(lambda w, r, c: (rerun(patches={'random.randint': w[0], 'random.randrange': r[0], 'random.choice': c[0]}), all(len(x) != 2 or x[1] - x[0] == 5 for x in w[1]) and all(not (1 <= len(x) <= 3 and all(type(y) is int for y in x)) or len(range(*x)) == 6 for x in r[1]) and all(len(x) != 1 or not hasattr(x[0], '__len__') or len(x[0]) == 6 for x in c[1]))[1])(rec('random.randint'), rec('random.randrange'), rec('random.choice'))`, hint: "A die has 6 sides, so roll each one with random.randint(1, 6)." },
    ],
  },
};
