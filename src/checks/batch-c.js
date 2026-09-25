// Grading rules for chapters 9-12 and practice grind_16-23 (ported from rules_c.py). Format: see src/checks.js.
// Each expr is Python, written with String.raw so its backslashes reach Python as typed.
const py = String.raw;

// ch12_s3: the colour to read for the colour c asked about in a question, given the rest r of the line after its
// question mark: c after yes or true, the other colour after no, not or false ('Is 20 white? no', f5_question_format).
// With neither, none if the answer names a colour instead, before any number ('Reading 20: is it white? It is
// black', f5_is_it_line), else c, as before questions were read. A colour after a number is another group's
// ('Which are black? [20, 45, 8] Which are white? [60]', f5_which_one_line; 'Are these white? [60] and these are
// black: [20, 45, 8]', f5_group_then_statement), so a question heading a group ('Which are black? [20, 45, 8]',
// f5_which_are_grouped) or getting no answer ('20 is black?!', f5_is_colour_interrobang) still counts.
const CH12_S3_ANSWER = py`(lambda c, r: (lambda a: (c if a.group(1).lower() in ('yes', 'yep', 'yeah', 'true') else {'black': 'white', 'white': 'black'}[c.lower()]) if a else '' if re.match(r'(?i)\D*(?:black|white)', r) else c)(re.match(r'(?i)\W*(yes|yep|yeah|true|no|nope|not|false)\b', r)))`;

// ch12_s3: line l with the colour words that name no colour taken out. "black or white" names none, so a header such
// as 'Testing [20, 45, 8, 60]: black or white?' isn't read as the readings' colour. A colour asked about after is or
// are ('Is 20 white?', 'Which are black?') is replaced by the one CH12_S3_ANSWER reads for it. A colour with a
// question mark after anything else still counts ('Black? [20, 45, 8]').
const CH12_S3_LINE = py`(lambda l: re.sub(r'(?i)\b((?:is|are)\b[^?]*?)\b(black|white)\s*\?', lambda q: '%s %s ' % (q.group(1), ${CH12_S3_ANSWER}(q.group(2), q.string[q.end():])), re.sub(r'(?i)\b(?:black|white)\s*(?:or|and|/|vs\.?|&)\s*(?:black|white)\b', ' ', l)))`;

// ch12_s3: whether lines t show each (reading, colour) pair of want, with that colour and not the other one. Read
// one way, each reading goes with the first colour after it on its line ('20 -> black'); read the other way, with
// the last colour before it ('black: 20', 'Black readings: [20, 45, 8]'), so a list of pairs and readings grouped
// by colour count too, in any order. A reading on a line with no colour, such as the list of readings, goes with
// none. The readings are those of want, as whole numbers, which may be printed with a zero decimal part ('20.0 ->
// black', f5_reading_float), but not as part of another number (12.4, 46.2). The lines are read as CH12_S3_LINE
// leaves them. An earlier rule only asked that the pairs were among those shown, which passed a reading shown
// under both colours (both_groups, all_white_group, no_else).
const CH12_S3_COLOURS = py`(lambda t, want: (lambda R: any((lambda P: all({c for n, c in P if n == r and c} == {col} for r, col in want))([(int(tk[j][0]), next((c for _, c in (tk[j + 1:] if m else tk[:j][::-1]) if c), '').lower()) for tk in [[x.groups() for x in re.finditer(R, ${CH12_S3_LINE}(l))] for l in t] for j in range(len(tk)) if tk[j][0]]) for m in (True, False)))(r'(?i)(?<![\d.])(%s)(?:\.0+)?(?!\.?\d)|(black|white)' % '|'.join(sorted({str(r) for r, _ in want}, key=len, reverse=True))))`;

// grind_23: whether line l says a run was skipped ('❌ Run4 doesn't fit'). Any n't counts ("Run4 wouldn't fit",
// "Couldn't fit Run4", f5_wouldnt_fit, f5_couldnt), and so does 'over' ('over by 26s', 'goes over 75s', 'over the
// limit'), except between points and a number, so a pick shown as 'Run1: 120 points over 28s' still counts
// (points_over_seconds), or after 'left' ('Run1 picked (47s left over)', f5_left_over_on_pick). So does going past
// the limit ('would go past the time limit', f5_past_limit), and needing more than the time left ('Run4 needs 31s,
// only 5s left', f5_only_left), unless the line says the run was picked or fits ('needs 42s: picked, only 5s left',
// f5_only_left_on_pick).
const G23_SKIP = py`(lambda l: polarity(l) == -1 or bool(re.search(r"(?i)\b(cannot|\w+n[’']t|(?:ca|wo|does|is|did|would|could|should|was|do)nt|skip\w*|exceed\w*|(?<!left )(?<!left-)(?:(?<!points )(?<!pts )over|over(?!\s*\d))|left out|drop\w*)\b|too long|too much|out of time|\bpast (?:the |your )?(?:\w+ )?(?:limit|time)\b|\b(?:go|goes|going|went) past\b|\bpast \d|❌|✗|✘|✖|🚫|⛔", l)) or bool(re.search(r'(?i)\bneed\w*\b.*\bonly\b.*\bleft\b', l) and not re.search(r'(?i)\b(fits?|picked|added|chosen|taken)\b', l)))`;

// grind_23: whether lines t show the runs picked in a rerun: the total points tot, or the names P in a row, in that
// order, with X not straight after them. X is the next run in the ranking, which fits only if the limit is ignored.
// Repeats of a name in a row are merged ("Run1 ... Run1 fits!"), and names on skip lines (G23_SKIP) don't count, so
// a program may still list all 4 runs, ranked, before or after the ones it picks.
// Known gap, kept on purpose: tot counts on any line, so a program that ignores MATCH_TIME but prints a running
// total ('Run3: total 280', 'Run4: total 375') passes. Telling that apart from the many correct ways to print each
// run's candidate total and then a verdict took a rule that kept rejecting correct programs, and this is a practice
// challenge with no XP.
const G23_PICKS = py`(lambda t, P, X, tot: (lambda S: has(tot, L=t) or (lambda N: (lambda n: any(n[i:i + len(P)] == P and n[i + len(P):i + len(P) + 1] != [X] for i in range(len(n))))([x for i, x in enumerate(N) if i == 0 or N[i - 1] != x]))([x for l in t if not S(l) for x in re.findall(r'\bRun[1-4]\b', l)]))(${G23_SKIP}))`;

// ch11_r5, ch11_boss: what is wrong with each turn of T, a turn by b degrees after the drive of a mm given as
// (a, b, left): 'direction' if it names the other side, 'sign' if it names none and its angle's sign is the other
// way, else ''. Its angle line is the first line holding b after the drive's line, the first holding a. The lines
// without numbers between them count too, so a side printed above the angle is read ('Turning left' then 'Gyro
// target: 90°', two_line_turn), but not a line with a number, which is another move or a motor's ('L: 400  R:
// 400'). So do the lines without numbers after the angle line, up to the next line with a number, so a side printed
// below it is read too ('Turning 90°' then '  Direction: left', f5_dir_below), but only when the angle line says it
// turns and no turn's angle line shows a minus on its angle. When a turn shares a line with the drive before it,
// the angle line found can be the next drive's ('Drive 90mm'), and the lines after that are another move's
// ('Grabbing with the right arm', f5_shared_line_arm_words). When an angle shows a minus, the program signs its
// angles, and the signs decide, as they did before the lines below were read: those lines can name a side for
// another reason ('Turn 45°' then '  (negative means left)', f5_legend_negative_left; '  left motor forward',
// f5_one_motor_signed; 'TURN 45 °' then '(left wheel drives)', f5_pivot_wheel_below_signed; 'Turn -45°' then
// '  right wheel forward, left wheel back', f5_wheels_below_swapped, f5_wheels_below_signed). A line below naming
// both sides says nothing of the turn's side ('Turn right 45°' then '  left wheel forward, right wheel back'), so it
// isn't read either, as before these lines were.
// Words name a side: left and right, and clockwise (right) and counterclockwise or anticlockwise (left), so a turn
// 'clockwise' both times fails (clockwise_both). Without a word, a lone L or R or an arrow (← ⬅ ↩ ↰ ↲ ↺ ⟲ ↶ for
// left, → ➡ ↪ ↱ ↳ ↻ ⟳ ↷ for right) names one, read only on lines saying they turn (turn, rotate, spin, pivot, °
// or deg) when the angle line does, so 'Turn L 45°' then 'Turn R 90°' fails as the words would (letters_swapped).
// A signed angle, +45 or -90, outweighs the side named, which may be a bullet ('➡️ Turning -90°',
// arrow_bullet_signed), as the left turn's -90 already outweighed 'right'. A turn naming no side with a word is
// read by its angle's sign, as turn() takes it: right is positive and left negative. So the right turn mustn't show
// -45, and the left one must show -90 unless a letter or an arrow names the left side alone ('Turn L 90°').
// CH11_TURNS is built from the pieces below.
// The numbers on line l, without their signs.
const CH11_NUMS = py`(lambda l: [abs(int(x)) for x in re.findall(r'-?\d+', l)])`;
// Whether line l says it turns.
const CH11_SAYS_TURN = py`(lambda l: re.search(r'(?i)turn|rotat|spin|pivot|°|deg', l))`;
// The sides, a set of 'L' and 'R', that lines v name with a word.
const CH11_WORD_SIDES = py`(lambda v: (lambda s: ({'L'} if re.search(r'(?i)left|counter[\s-]?clockwise|anti[\s-]?clockwise|\bccw\b', s) else set()) | ({'R'} if re.search(r'(?i)right|(?<![a-z-])clockwise|\bcw\b', s) else set()))('\n'.join(v)))`;
// The turn by b degrees after the drive of a mm, as (e, v): its angle line e, and the lines v read for it, which
// are the lines without numbers between the drive's line and e, then e, then, if below and e says it turns, the
// lines without numbers after it, up to the next line with a number, leaving out those naming both sides with
// words. ('', []) if there is no such line.
const CH11_TURN_LINES = py`(lambda a, b, below: (lambda i: (lambda j: (L[j], [l for l in L[i + 1:j] if not re.search(r'\d', l)] + [L[j]] + ([l for l in L[j + 1:next((k for k in range(j + 1, len(L)) if re.search(r'\d', L[k])), len(L))] if ${CH11_WORD_SIDES}([l]) != {'L', 'R'}] if below and ${CH11_SAYS_TURN}(L[j]) else [])) if j is not None else ('', []))(next((j for j in range(i + 1, len(L)) if b in ${CH11_NUMS}(L[j])), None)))(next((i for i, l in enumerate(L) if a in ${CH11_NUMS}(l)), len(L))))`;
// The sides that those of lines v saying they turn name with a lone letter or an arrow.
const CH11_MARK_SIDES = py`(lambda v: (lambda u: ({'L'} if re.search(r'(?i)(?<![a-z])l(?![a-z])|[←⬅↩↰↲↺⟲↶]', u) else set()) | ({'R'} if re.search(r'(?i)(?<![a-z])r(?![a-z])|[→➡↪↱↳↻⟳↷]', u) else set()))('\n'.join(l for l in v if ${CH11_SAYS_TURN}(l))))`;
// The sides the turn with angle line e and lines v names: those named with a word, else, if e says it turns, those
// named with a letter or an arrow.
const CH11_SIDES = py`(lambda e, v: ${CH11_WORD_SIDES}(v) or (${CH11_MARK_SIDES}(v) if ${CH11_SAYS_TURN}(e) else set()))`;
// What is wrong with the turn (a, b, left), reading the lines below its angle if below.
const CH11_TURN = py`(lambda a, b, left, below: (lambda e, v: (lambda side, neg, pos: 'direction' if ((side == {'R'} and not neg) if left else (side == {'L'} and not pos)) else 'sign' if not ${CH11_WORD_SIDES}(v) and ${CH11_SAYS_TURN}(e) and ((not neg and side != {'L'}) if left else bool(neg)) else '')(${CH11_SIDES}(e, v), re.search(r'-\s*%d' % b, e), re.search(r'\+\s*%d' % b, e)))(*${CH11_TURN_LINES}(a, b, below)))`;
// What is wrong with each turn of T, reading the lines below the angles when no angle line shows a minus on its angle.
const CH11_TURNS = py`(lambda T: (lambda below: [${CH11_TURN}(a, b, left, below) for a, b, left in T])(not any(re.search(r'-\s*%d' % b, ${CH11_TURN_LINES}(a, b, False)[0]) for a, b, _ in T)))`;

export const BATCH_C = {
  // ---------- Chapter 9 ----------
  ch9_r1: {
    // No Round line may follow 'Game Over!', but other lines may: the prototype wanted 'Game Over!' on the last
    // line, which the task never asks for, and rejected a goodbye after it (r1_thanks_after).
    // 'Game Over!' may have emoji or symbols around it, as the Round lines may ('💀 Game Over!', r2_emoji_over),
    // but not other capitals: a Game Over line that only matches once capitals and punctuation are ignored gets
    // its own hint.
    output: [
      { expr: py`any(re.fullmatch(r'\W*Game Over!\W*', l) for l in L) or not any(re.fullmatch(r'(?i)\W*game\W*over\W*', l) for l in L)`,
        hint: "So close! Check the capital letters and punctuation in your Game Over line: it should say 'Game Over!'." },
      // The same for the Round lines: '⚔️ round 1!' only differs in its capitals (r3_round_lower).
      { expr: py`subseq([r're:.*Round 1!', r're:.*Round 2!', r're:.*Round 3!', r're:.*Round 4!']) or not subseq([r're:(?i).*\bround\W*1\W*', r're:(?i).*\bround\W*2\W*', r're:(?i).*\bround\W*3\W*', r're:(?i).*\bround\W*4\W*'])`,
        hint: "So close! Check the capital letters and punctuation in your Round lines: they should look like '⚔️ Round 1!'." },
      { expr: py`subseq([r're:.*Round 1!', r're:.*Round 2!', r're:.*Round 3!', r're:.*Round 4!', r're:\W*Game Over!\W*']) and not has('Round 5') and not any(re.search(r'Round \d', l) for l in L[[i for i, l in enumerate(L) if re.fullmatch(r'\W*Game Over!\W*', l)][0] + 1:])`,
        hint: "Print 'Round 1!' up to 'Round 4!' as the game goes, then 'Game Over!' when the answer is 'n'." },
    ],
    concepts: [{ expr: py`count(ast.Break) >= 1`, hint: "The task asks you to use break to stop the loop when the answer is 'n'." }],
    // The capitals of Game Over and the Round lines are left to the near-miss checks above, so a near miss gets
    // only that hint.
    probes: [{ expr: py`(lambda t: subseq([r're:(?i).*\bround\W*1\W*', r're:(?i).*\bround\W*2\W*', r're:(?i)\W*game\W*over\W*'], L=t) and not any(re.search(r'(?i)\bround\W*3\b', l) for l in t))(rerun({'responses': "['y', 'n']"})[0])`,
      hint: "Read each answer from responses[i] and stop when it is 'n', so the game works for any list of answers." }],
  },
  // The flips are the first 10 lines naming one side of the coin; the tally is whatever comes after them.
  // The prototype counted exactly 10 such lines and read the tally from the last 2 lines, which rejected a
  // tally printed as "Heads: 4" / "Tails: 6" (ALT_two_line_tally).
  // W reads a line's flip: the side it names that isn't a count label ('Heads: 3', 'Tails so far: 1'), if it
  // names just one, so 'Flip 1: Tails (Heads so far: 0, Tails so far: 1)' is a Tails flip (r3_running_tally),
  // while a tally such as 'Heads: 4 Tails: 6' and a question such as 'Heads or Tails?' aren't flips. The
  // prototype skipped every line naming both sides.
  ch9_r2: {
    output: [
      { expr: py`(lambda W: len([l for l in L if W(l)]) >= 10)((lambda l: (lambda nc: nc[0] if len(set(nc)) == 1 else None)(re.findall(r'\b(Heads|Tails)\b(?!\s*[:=]\s*\d|\s+(?:so far|count|total)\s*[:=]?\s*\d)', l))))`,
        hint: "Print every flip on its own line, so I can see all 10 Heads or Tails results." },
      // Each count must sit with its own label, read three ways: the number after each label ("Heads: 3"),
      // the number before it ("3 heads"), or the labels' order matching the numbers' order ("Heads/Tails: 3/7").
      // The prototype's numset took the two numbers in either order, so counters swapped between Heads and Tails
      // passed (r1_tally_no_labels_swapped). A tally with no labels at all still only needs both numbers.
      { expr: py`(lambda W: (lambda k: (lambda T, nh, nt: (not re.search(r'(?i)\b(heads?|tails?)\b', T) and numset([nh, nt], L=T.split('\n'))) or [[int(x) for x in re.findall(r'(?i)\b%s\b[^\d\n]*?(\d+)' % w, T)][:1] for w in ('heads?', 'tails?')] == [[nh], [nt]] or [[int(x) for x in re.findall(r'(?i)(\d+)[^\d\n]*?\b%s\b' % w, T)][:1] for w in ('heads?', 'tails?')] == [[nh], [nt]] or (lambda a, b, n: a is not None and b is not None and len(n) >= 2 and (n[:2] == [nh, nt] if a.start() < b.start() else n[:2] == [nt, nh]))(re.search(r'(?i)\bheads?\b', T), re.search(r'(?i)\btails?\b', T), [int(x) for x in re.findall(r'\d+', T)]))('\n'.join(L[k[9] + 1:]), sum(W(L[j]) == 'Heads' for j in k[:10]), sum(W(L[j]) == 'Tails' for j in k[:10])))([j for j, l in enumerate(L) if W(l)]))((lambda l: (lambda nc: nc[0] if len(set(nc)) == 1 else None)(re.findall(r'\b(Heads|Tails)\b(?!\s*[:=]\s*\d|\s+(?:so far|count|total)\s*[:=]?\s*\d)', l))))`,
        hint: "After the 10 flips, print how many Heads and how many Tails you counted. They must match the flips you printed." },
    ],
    probes: [
      { expr: py`sig('flip_coin') == (0, 0) and {callf('flip_coin')[0] for _ in range(200)} == {'Heads', 'Tails'}`,
        hint: "Make a function flip_coin() with no inputs that returns 'Heads' or 'Tails' using random.choice." },
      // The scripted probes below patch random.choice, which a loop calling random.choice itself also calls, so a
      // flip_coin that is defined but never used passed them (r2_function_unused).
      { expr: py`trace.count('flip_coin') >= 10`,
        hint: "Call flip_coin() for each of the 10 flips, instead of calling random.choice in your loop." },
      // Before the scripted probes, which a flip_coin using random.randint instead fails too, with a hint about
      // calling it once per flip (r3_randint_coin). Every flip that passes them calls random.choice.
      { expr: py`(lambda w: (rerun(patches={'random.choice': w[0]}), len(w[1]) >= 10)[1])(rec('random.choice'))`,
        hint: "Make flip_coin() pick its answer with random.choice(['Heads', 'Tails']), as the task says." },
      // Scripted flips instead of the prototype's "always Tails", which a program that prints one flip and
      // counts another also passes (double_flip).
      { expr: py`(lambda W: (lambda t: (lambda k: [W(t[j]) for j in k[:10]] == ['Heads', 'Tails', 'Tails', 'Heads', 'Tails', 'Tails', 'Tails', 'Heads', 'Tails', 'Tails'] and numset([3, 7], L=t[k[9] + 1:]))([j for j, l in enumerate(t) if W(l)]))(rerun(patches={'random.choice': seq(['Heads', 'Tails', 'Tails', 'Heads', 'Tails', 'Tails', 'Tails', 'Heads', 'Tails', 'Tails'])})[0]))((lambda l: (lambda nc: nc[0] if len(set(nc)) == 1 else None)(re.findall(r'\b(Heads|Tails)\b(?!\s*[:=]\s*\d|\s+(?:so far|count|total)\s*[:=]?\s*\d)', l))))`,
        hint: "Call flip_coin() once for each flip, then print and count that same result." },
      // The same 3 Heads and 7 Tails, now read label by label as in the output check (r1_tally_no_labels_swapped).
      { expr: py`(lambda W: (lambda t: (lambda k: (lambda T, nh, nt: (not re.search(r'(?i)\b(heads?|tails?)\b', T) and numset([nh, nt], L=T.split('\n'))) or [[int(x) for x in re.findall(r'(?i)\b%s\b[^\d\n]*?(\d+)' % w, T)][:1] for w in ('heads?', 'tails?')] == [[nh], [nt]] or [[int(x) for x in re.findall(r'(?i)(\d+)[^\d\n]*?\b%s\b' % w, T)][:1] for w in ('heads?', 'tails?')] == [[nh], [nt]] or (lambda a, b, n: a is not None and b is not None and len(n) >= 2 and (n[:2] == [nh, nt] if a.start() < b.start() else n[:2] == [nt, nh]))(re.search(r'(?i)\bheads?\b', T), re.search(r'(?i)\btails?\b', T), [int(x) for x in re.findall(r'\d+', T)]))('\n'.join(t[k[9] + 1:]), 3, 7))([j for j, l in enumerate(t) if W(l)]))(rerun(patches={'random.choice': seq(['Heads', 'Tails', 'Tails', 'Heads', 'Tails', 'Tails', 'Tails', 'Heads', 'Tails', 'Tails'])})[0]))((lambda l: (lambda nc: nc[0] if len(set(nc)) == 1 else None)(re.findall(r'\b(Heads|Tails)\b(?!\s*[:=]\s*\d|\s+(?:so far|count|total)\s*[:=]?\s*\d)', l))))`,
        hint: "When I picked 3 Heads and 7 Tails, your Heads and Tails counts came out swapped: add 1 to heads only when the flip is 'Heads'." },
    ],
  },
  ch9_r3: {
    // The prototype wanted 2 numbers on one line per round and the score in the last 3 lines, which rejected
    // rolls printed on their own lines and a 3-line score followed by the winner (ALT_separate_lines).
    output: [
      { expr: py`len(ints(out)) >= 10`,
        hint: "Print both dice rolls in every round, so I can see what you and the enemy rolled." },
      { expr: py`ns.get('player_wins', 0) + ns.get('enemy_wins', 0) + ns.get('ties', 0) == 5 and numset([ns['player_wins'], ns['enemy_wins'], ns['ties']], L=L[-5:])`,
        hint: "Add 1 to player_wins, enemy_wins or ties in every round, then print all three at the end." },
    ],
    probes: [
      // First, so dice rolled once before the loop hear about that, not about their comparisons (r1_rolls_outside).
      { expr: py`(lambda w: (rerun(patches={'random.randint': w[0]}), len(w[1]) >= 10 and (1, 6) in w[1])[1])(rec('random.randint'))`,
        hint: "Roll both dice with random.randint(1, 6) inside the loop, so every round gets new rolls." },
      // Task step 5 and 6: who won. When every round goes to one side and then every round to the other, the output
      // must change by more than the order of its characters: rolls and scores only swap places, so a program
      // that prints no winner at all, per round or overall, prints the same characters both times
      // (r1_ties_no_winner_line). This needs no win words, and 'Player 1' / 'Player 2' labels still differ.
      { expr: py`(lambda a, b: sorted(''.join(a)) != sorted(''.join(b)))(rerun(patches={'random.randint': seq([6, 1])})[0], rerun(patches={'random.randint': seq([1, 6])})[0])`,
        hint: "Print who won each round and who won the battle, not only the dice rolls." },
      { expr: py`(lambda r: (r.ns.get('player_wins'), r.ns.get('enemy_wins'), r.ns.get('ties')) == (2, 2, 1))(rerun(patches={'random.randint': seq([6, 1, 1, 6, 3, 3, 5, 2, 2, 5])})[1])`,
        hint: "When I picked the dice rolls, your counters came out wrong. The higher roll wins the round, and equal rolls are a tie." },
      { expr: py`rerun(patches={'random.randint': lambda a, b: 4})[1].ns.get('ties') == 5`,
        hint: "When both dice show the same number, it's a tie: add 1 to ties, not to a winner." },
      // The probes above are symmetric, since the enemy may roll first (ALT_separate_lines), so reversed
      // comparisons passed them (r1_lower_wins). Here one side always rolls 6 and the other 1, and the variables
      // left holding them tell who is who: a name like player, you or me holding 6 (or enemy, them or cpu
      // holding 1) means player_wins must be 5. Only when the names say nothing, or say both, is either side allowed.
      { expr: py`(lambda r: (lambda roles, got: sorted(got[:2]) == [0, 5] and got[2] == 0 and got == ((5, 0, 0) if roles == {1} else (0, 5, 0) if roles == {-1} else got))({(1 if (re.search(r'(?i)player|you|hero|user|human|^(me|my\w*|mine|p\d?|p_\w*)$', k) and v == 6) or (re.search(r'(?i)enemy|them|opp|foe|cpu|comp|monster|villain|rival|^(e\d?|e_\w*)$', k) and v == 1) else -1) for k, v in r.ns.items() if type(v) is int and v in (1, 6) and not re.search(r'(?i)win|score|tie|point|round|count', k) and re.search(r'(?i)player|you|hero|user|human|^(me|my\w*|mine|p\d?|p_\w*)$|enemy|them|opp|foe|cpu|comp|monster|villain|rival|^(e\d?|e_\w*)$', k)}, (r.ns.get('player_wins'), r.ns.get('enemy_wins'), r.ns.get('ties'))))(rerun(patches={'random.randint': seq([6, 1])})[1])`,
        hint: "The higher roll wins the round: when you roll 6 and the enemy rolls 1, add 1 to player_wins." },
      // Task step 6's overall winner, which the swap probe above can't check, since the round lines already change
      // (r2_overall_always_you, r2_overall_by_last_round). One side wins rounds 1-4 and the other round 5, and the
      // counters say which side is which, since the enemy may roll first. From the last line holding a 4 (the
      // final score: the rolls are 6 and 1), nothing may say the side that won 1 round won the battle. Scores
      // such as "Enemy wins: 1" or "You won only 1 rounds" don't count as claims (r3_you_won_only), nor does
      // "Winner: Player 2" for the player.
      { expr: py`(lambda P, E: all((lambda t, pw, ew: not any((P if ew > pw else E)(l) for l in t[max([i for i, l in enumerate(t) if 4 in ints(l)] or [len(t)]):]))(r[0], r[1].ns.get('player_wins'), r[1].ns.get('enemy_wins')) for r in (rerun(patches={'random.randint': seq([6, 1, 6, 1, 6, 1, 6, 1, 1, 6])}), rerun(patches={'random.randint': seq([1, 6, 1, 6, 1, 6, 1, 6, 6, 1])}))))(lambda l: re.search(r"(?i)(?<!if )(?<!when )(?<!if the )(?<!when the )\b(you|player|hero|human)\s+(are\s+|is\s+|were\s+|was\s+|have\s+|has\s+)?(the\s+)?(overall\s+|big\s+|grand\s+|ultimate\s+|final\s+)?(wins?|won|winner|champion|champ|victorious)\b(?!\W*(\d|no\b|none|zero|only\b|just\b))|\b(winner|champion|champ|victor)\b\W*(is\s+|was\s+)?(the\s+)?(you|player|hero|human)\b(?!\s*2)|(?<!if )(?<!when )(?<!if the )(?<!when the )\b(enemy|monster|foe|opponent|computer|cpu|villain|rival)\s+(loses|lost|is\s+defeated|was\s+defeated)\b(?!\W*(\d|no\b|none|zero|only\b|just\b))", l), lambda l: re.search(r"(?i)(?<!if )(?<!when )(?<!if the )(?<!when the )\b(enemy|monster|foe|opponent|computer|cpu|villain|rival)\s+(is\s+|was\s+|has\s+)?(the\s+)?(overall\s+|big\s+|grand\s+|ultimate\s+|final\s+)?(wins?|won|winner|champion|champ|victorious)\b(?!\W*(\d|no\b|none|zero|only\b|just\b))|\b(winner|champion|champ|victor)\b\W*(is\s+|was\s+)?(the\s+)?(enemy|monster|foe|opponent|computer|cpu|villain|rival|player\s*2)\b|(?<!if )(?<!when )(?<!if the )(?<!when the )\byou\s+(lose|lost)\b(?!\W*(\d|no\b|none|zero|only\b|just\b))", l))`,
        hint: "When one side won 4 rounds and the other won 1, your program named the wrong overall winner: pick it from player_wins and enemy_wins after all 5 rounds." },
    ],
  },
  ch9_r4: {
    output: [
      // A near miss first: lines that match once capitals and punctuation are ignored, but not as printed, such as
      // 'guess 5 accepted!', get a hint about the lines' spelling (r3_lower_guess). subseq can't name the line.
      { expr: py`(lambda P, lo: subseq(P) or not subseq([lo(p) for p in P], L=[lo(l) for l in L]))(['Guess 5 accepted!', '15 is out of range! Must be 1-10.', '0 is out of range! Must be 1-10.', 'Guess 8 accepted!', 'Guess 3 accepted!', '-1 is out of range! Must be 1-10.', 'Guess 10 accepted!'], lambda x: ' '.join(re.sub(r'[^\w\s-]', ' ', x).lower().split()))`,
        hint: "So close! Check the capital letters and punctuation in your guess lines: they should look like 'Guess 5 accepted!' and '15 is out of range! Must be 1-10.'" },
      { expr: py`subseq(['Guess 5 accepted!', '15 is out of range! Must be 1-10.', '0 is out of range! Must be 1-10.', 'Guess 8 accepted!', 'Guess 3 accepted!', '-1 is out of range! Must be 1-10.', 'Guess 10 accepted!'])`,
        hint: "For each guess in the list, print 'Guess 5 accepted!' or '15 is out of range! Must be 1-10.', in the same order as the list." },
      // subseq lets other lines in between, so 'accepted' printed for every guess before the range check passed
      // (r2_accept_printed_first).
      { expr: py`not re.search(r'(?i)Guess (15|0|-1) accepted', out)`,
        hint: "Print 'Guess ... accepted!' only for guesses from 1 to 10, not for the ones that are out of range." },
    ],
    // The prototype wanted exactly 4 printed lines; a heading printed by the function is fine (ALT_and_check).
    // Capitals and punctuation are left to the near-miss check above, so a near miss gets only that hint.
    probes: [{ expr: py`(lambda r, lo: r[0] == [1, 10] and subseq([lo(p) for p in ['Guess 1 accepted!', '11 is out of range! Must be 1-10.', 'Guess 10 accepted!', '0 is out of range! Must be 1-10.']], L=[lo(l) for l in r[1]]) and not any(re.search(r'(?i)Guess (11|0) accepted', l) for l in r[1]))(callf('validate_guess', [1, 11, 10, 0]), lambda x: ' '.join(re.sub(r'[^\w\s-]', ' ', x).lower().split()))`,
      hint: "validate_guess(guesses) should print a line for every guess and return a list of only the good guesses (1 to 10)." }],
  },
  // The score is read from the last line that has a number and says score, points, total, right or correct,
  // or else from the last line with a number: the task never says the score goes on the last line, and the
  // prototype's L[-1] rejected a goodbye printed after it (r1_thanks_after). Percentages are taken out first,
  // so "You got 20% correct!" after the score isn't read as a score of 20 (r2_percent_after).
  ch9_r5: {
    output: [{ expr: py`len(L) >= 6 and any(re.search(r'\d', l) for l in L)`,
      hint: "Show the cards for all 5 rounds, then print the final score." }],
    probes: [
      { expr: py`all(isinstance(v, int) and 1 <= v <= 13 for v in [callf('draw_card')[0] for _ in range(100)])`,
        hint: "Make a function draw_card() that returns random.randint(1, 13)." },
      // Before the score probes, which patch randint: randrange's cards aren't scripted, so its scores came out
      // random and the hint blamed the comparisons (r1_randrange).
      { expr: py`(lambda w: (rerun(patches={'random.randint': w[0]}), (1, 13) in w[1])[1])(rec('random.randint'))`,
        hint: "Make draw_card() return random.randint(1, 13), as the task says." },
      // 5 rounds need at least 6 cards (ALT_carry_card draws 6, the reference 10); two cards drawn once before
      // the loop and compared in every round are 2 (r1_same_card).
      { expr: py`(lambda w: (rerun(patches={'random.randint': w[0]}), len(w[1]) >= 6)[1])(rec('random.randint'))`,
        hint: "Draw new cards in every round: call draw_card() inside your loop, not once before it." },
      { expr: py`(lambda t: nums([3], L=[l for l in t if re.search(r'\d', l) and re.search(r'(?i)score|points?|total|right|correct', l)][-1:]) or nums([3], L=[l for l in t if re.search(r'\d', l)][-1:]))([re.sub(r'\d+(\.\d+)?\s*%', '', l) for l in rerun(patches={'random.randint': seq(list(range(1, 14)))})[0]])`,
        hint: "When I made every card bigger than the one before, your score was wrong. 'high' is right when the next card is bigger." },
      { expr: py`(lambda t: nums([2], L=[l for l in t if re.search(r'\d', l) and re.search(r'(?i)score|points?|total|right|correct', l)][-1:]) or nums([2], L=[l for l in t if re.search(r'\d', l)][-1:]))([re.sub(r'\d+(\.\d+)?\s*%', '', l) for l in rerun(patches={'random.randint': seq(list(range(13, 0, -1)))})[0]])`,
        hint: "When I made every card smaller than the one before, your score was wrong. 'low' is right when the next card is smaller." },
      // Cards that go up and down, since with the two runs above comparing each card with the first one, or
      // using the guesses backwards, scored the same as playing right (r2_fixed_base_card, r2_pop_guesses). Fresh
      // pairs (the reference) and carrying the new card on to the next round (ALT_carry_card) both score 4 here;
      // the first card for every round scores 3, and the guesses backwards 0.
      { expr: py`(lambda t: nums([4], L=[l for l in t if re.search(r'\d', l) and re.search(r'(?i)score|points?|total|right|correct', l)][-1:]) or nums([4], L=[l for l in t if re.search(r'\d', l)][-1:]))([re.sub(r'\d+(\.\d+)?\s*%', '', l) for l in rerun(patches={'random.randint': seq([7, 9, 3, 1, 12, 11, 4, 5, 13, 2])})[0]])`,
        hint: "When I picked cards that go up and down, your score was wrong: compare each round's new card with the card just before it, using that round's guess." },
      { expr: py`(lambda w: (rerun(patches={'random.seed': w[0]}), (42,) in w[1])[1])(rec('random.seed'))`,
        hint: "Keep random.seed(42) at the top of your program, as the task says." },
      // The score probes patch randint, and the one above only looks for a seed call, so random.seed(42) inside
      // draw_card, which makes every card the same, passed (r3_seed_inside_draw). No seed call may come after
      // the first randint, as in grind_16.
      { expr: py`(lambda log, sd, ri: (rerun(patches={'random.seed': lambda *a, **k: (log.append('seed'), sd(*a, **k))[1], 'random.randint': lambda *a, **k: (log.append('randint'), ri(*a, **k))[1]}), 'randint' not in log or 'seed' not in log[log.index('randint'):])[1])([], rec('random.seed')[0], rec('random.randint')[0])`,
        hint: "Call random.seed(42) once at the top of your program, not inside draw_card or your loop, so the cards can come out different." },
    ],
  },
  // The title screen may be anywhere in the output, so a 'Loading game...' line before it is fine (r3_welcome_before):
  // the prototype wanted exactly those 4 lines, but the task only says what show_title prints, and the probes
  // check that. Near misses in the game name or the Press ENTER line get their own hints, since this check can't
  // name the line that differs (r3_press_enter_period, r3_mixed_case_name).
  // The Press ENTER line may be indented, centred like the name (m_ct2_border_var): the task only says what it
  // says. A line that differs only in its spaces ('Press  ENTER to start', 'DRAGONQUEST') hears about the spaces,
  // not about capitals and punctuation, so those checks come first.
  ch9_s1: {
    output: [
      { expr: py`any(l.strip() == 'DRAGON QUEST' for l in L) or not any(''.join(l.split()) == 'DRAGONQUEST' for l in L)`,
        hint: "So close! Check the spaces in your game name: call show_title with 'DRAGON QUEST', just as the task writes it." },
      { expr: py`any(l.strip() == 'Press ENTER to start' for l in L) or not any(''.join(l.split()) == 'PressENTERtostart' for l in L)`,
        hint: "So close! Check the spaces in your 'Press ENTER to start' line: one space between each word, just as the task writes it." },
      { expr: py`any(l.strip() == 'DRAGON QUEST' for l in L) or not any(re.fullmatch(r'(?i)\W*dragon\W*quest\W*', l.strip()) for l in L)`,
        hint: "So close! Check the capital letters and punctuation in your game name: call show_title with 'DRAGON QUEST', just as the task writes it." },
      { expr: py`any(l.strip() == 'Press ENTER to start' for l in L) or not any(re.fullmatch(r'(?i)\W*press\W+enter\W+to\W+start\W*', l) for l in L)`,
        hint: "So close! Check the capital letters and punctuation in your 'Press ENTER to start' line: it should match the task exactly." },
      { expr: py`any(L[i] == '=' * 30 and L[i + 3] == '=' * 30 and L[i + 1].strip() == 'DRAGON QUEST' and 8 <= len(L[i + 1]) - len(L[i + 1].lstrip()) <= 10 and L[i + 2].strip() == 'Press ENTER to start' for i in range(len(L) - 3))`,
        hint: "Print 4 lines: 30 '=' signs, the game name in the middle of a 30-character line, 'Press ENTER to start', then 30 '=' again." },
    ],
    // The prototype's two probes, swapped so a program with no show_title at all hears about the function first.
    probes: [
      // One parameter, with or without a default value: show_title(game_name="MY GAME") is still show_title(game_name)
      // (r2_default_param).
      { expr: py`sig('show_title')[0] == 1`, hint: "Make a function show_title with exactly one parameter, game_name, and call it with 'DRAGON QUEST'." },
      // A show_title that returns the title screen for its caller to print prints nothing itself, and was told to
      // use .center(30), which it did (r3_returns_string).
      { expr: py`len(callf('show_title', 'HI')[1]) > 0`,
        hint: "show_title should print the title screen itself, with print() inside the function, instead of returning it." },
      { expr: py`(lambda t: len(t) == 4 and t[1].strip() == 'HI' and 13 <= len(t[1]) - len(t[1].lstrip()) <= 15)(callf('show_title', 'HI')[1])`,
        hint: "show_title should center any name you give it, not only DRAGON QUEST. Try the string method .center(30)." },
    ],
  },
  // Other lines may come before the countdown, such as 'Get ready...' (r2_ready_line): the prototype's lines([...])
  // wanted exactly 7. The numbers must still be the only number lines, one per line and right before BLAST OFF!,
  // with the returned 'launched' printed after it, alone or with a label ('The rocket was launched', 'Status:
  // launched', r3_while_param_label, r3_result_label_colon). That check can't name a differing line the way
  // lines([...]) does, so near misses get their own hints: a BLAST OFF line that only matches once capitals and
  // punctuation are ignored, and number lines with punctuation around them, such as '5...' (r3_dots).
  ch9_s2: {
    output: [
      { expr: py`any(re.fullmatch(r'.*BLAST OFF!', l) for l in L) or not any(re.search(r'(?i)blast\W*off', l) for l in L)`,
        hint: "So close! Check the capital letters and punctuation in your BLAST OFF line: it should say '🚀 BLAST OFF!'." },
      { expr: py`(lambda D: D(L, 5) or not D([re.sub(r'^[^\w-]*(-?\d+)\W*$', r'\1', l) for l in L], 5))(lambda T, n: [l for l in T if re.fullmatch(r'-?\d+', l)] == [str(i) for i in range(n, 0, -1)] and any(T[i:i + n] == [str(j) for j in range(n, 0, -1)] and re.search(r'(?i)blast\W*off', T[i + n]) for i in range(len(T) - n)))`,
        hint: "So close! Check the punctuation in your countdown lines: each one should be only the number, like 5." },
      { expr: py`(lambda D: D(L, 5) and any(re.search(r'\blaunched\b', l) for l in L[[i for i, l in enumerate(L) if re.fullmatch(r'.*BLAST OFF!', l)][-1] + 1:]))(lambda T, n: [l for l in T if re.fullmatch(r'-?\d+', l)] == [str(i) for i in range(n, 0, -1)] and any(T[i:i + n] == [str(j) for j in range(n, 0, -1)] and re.fullmatch(r'.*BLAST OFF!', T[i + n]) for i in range(len(T) - n)))`,
        hint: "Count down from 5 to 1, print '🚀 BLAST OFF!', then print what countdown returned." },
    ],
    // The near misses are left to the checks above, so a near miss gets only that hint.
    probes: [{ expr: py`(lambda D, r: r[0] == 'launched' and D([re.sub(r'^[^\w-]*(-?\d+)\W*$', r'\1', l) for l in r[1]], 3))(lambda T, n: [l for l in T if re.fullmatch(r'-?\d+', l)] == [str(i) for i in range(n, 0, -1)] and any(T[i:i + n] == [str(j) for j in range(n, 0, -1)] and re.search(r'(?i)blast\W*off', T[i + n]) for i in range(len(T) - n)), callf('countdown', 3))`,
      hint: "countdown(n) should count down from whatever n it gets, print BLAST OFF!, and return 'launched'." }],
  },
  // Only the menu's own lines are read, the ones naming Fight, Inventory, Goodbye or Unknown, so a heading such as
  // '=== MAIN MENU ===' is fine (r3_menu_header): the prototype's lines([...]) wanted exactly 4 lines. That check
  // can't name a differing line, so a near miss gets its own hint.
  ch9_s3: {
    output: [
      { expr: py`(lambda T, lo: lines([r're:.*Fight!', r're:.*Inventory', r're:.*Fight!', r're:.*Goodbye!'], L=T) or not lines([r're:.*\bfight', r're:.*\binventory', r're:.*\bfight', r're:.*\bgoodbye'], L=[lo(l) for l in T]))([l for l in L if re.search(r'(?i)fight|inventory|goodbye|unknown', l)], lambda x: ' '.join(re.sub(r'[^\w\s]', ' ', x).lower().split()))`,
        hint: "So close! Check the capital letters and punctuation in your menu lines: they should look like '⚔️ Fight!', '🎒 Inventory' and '👋 Goodbye!'." },
      { expr: py`lines([r're:.*Fight!', r're:.*Inventory', r're:.*Fight!', r're:.*Goodbye!'], L=[l for l in L if re.search(r'(?i)fight|inventory|goodbye|unknown', l)])`,
        hint: "Go through the choices in order: '1' prints Fight!, '2' prints Inventory and '3' prints Goodbye!." },
    ],
    concepts: [{ expr: py`count(ast.Break) >= 1`, hint: "The task asks you to use break to leave the loop when the choice is '3'." }],
    probes: [
      // Capitals and punctuation are left to the near-miss check above, so a near miss gets only that hint.
      { expr: py`(lambda lo: lines([r're:.*\binventory', r're:.*\bunknown choice\b.*', r're:.*\bgoodbye'], L=[lo(l) for l in rerun({'choices': "['2', '9', '3', '1']"})[0] if re.search(r'(?i)fight|inventory|goodbye|unknown', l)]))(lambda x: ' '.join(re.sub(r'[^\w\s]', ' ', x).lower().split()))`,
        hint: "Your menu should work for any list of choices: print 'Unknown choice' for anything else, and stop at '3'." },
      // With no '3' in the choices, the menu's Goodbye line may not be printed: printed after the loop, it passed the
      // checks above, where the loop always ends at '3' (r3_goodbye_after_loop). Only a line that is just the
      // Goodbye counts, so a for-else farewell such as 'No more choices, goodbye!' is fine.
      { expr: py`not any(re.fullmatch(r'(?i)\W*goodbye\W*', l) for l in rerun({'choices': "['1', '2']"})[0])`,
        hint: "Only say Goodbye when the choice is '3': print it inside your loop, just before break." },
    ],
  },
  ch9_boss: {
    // The task says 'Print each round: moves and who won', so both are counted (no_round_winner prints only
    // the moves). The prototype counted only win/tie words, but printing get_winner's answer ('player',
    // ALT_beats_dict) or 'Winner: You' (ALT_winner_label) has none, so a line ending in player/computer/tie
    // and the word 'winner' count too, and so do lose/loses/lost ("You lose this round").
    output: [
      { expr: py`len([l for l in L if re.search(r'(?i)\b(rock|paper|scissors)\b', l)]) >= 5 and len([l for l in L if re.search(r'(?i)\b(win|wins|won|winner|tie|draw|lose|loses|lost)\b|\b(player|computer|tie)\W*$', l)]) >= 5`,
        hint: "Print each of the 5 rounds: both moves and who won." },
      // Task step 7: one more result line than the 5 rounds, for the overall champion (r1_no_champion stops at
      // the score). Champion words count here too, so 'Champion: You' and 'You are the overall champion!' do, and
      // so do beat and defeat ('Player defeats Computer!').
      { expr: py`len([l for l in L if re.search(r'(?i)\b(win|wins|won|winner|tie|tied|draw|lose|loses|lost|champion|champ|overall|victory|victorious|nobody|beat|beats|defeat|defeats|defeated)\b|🏆|\b(player|computer|tie)\W*$', l)]) >= 6`,
        hint: "At the end, print the final score and who is the overall champion." },
    ],
    // get_winner's answers must be the task's own words before they are checked move by move, so 'Player' or 'you'
    // hears about the words, not about the rules of the game, which it got right (r3_returns_capitalized,
    // r3_returns_you).
    // The first scripted probes let the player win rounds 1-4 and tie round 5 (4-0-1), so nothing in a right answer
    // says the computer won anything; later ones turn that round (0-4-1) or make every round a tie. The
    // prototype's script gave 2-2, which also came out 2-2 with the moves
    // swapped in get_winner(computer, player) (r1_swapped_args) or the computer's move picked once before the
    // loop (r1_choice_once), and it read the score from the last 2 lines, which a 'Ties: 1' line or a goodbye
    // after the champion pushed out (r1_ties_line, r1_thanks_after). The score is now read from the lines after the
    // 5th round's result.
    // A line that says both sides won, such as the scoreboard heading 'Player wins | Computer wins', is no claim
    // for either side (r3_scoreboard_header_table), and "neither player wins" or "no player wins" says nobody won
    // (r3_neither_player_wins).
    probes: [
      { expr: py`not callable(ns.get('get_winner')) or all(val('get_winner(%r, %r)' % (p, c)) in ('player', 'computer', 'tie') for p in ('rock', 'paper', 'scissors') for c in ('rock', 'paper', 'scissors'))`,
        hint: "get_winner should return exactly one of the task's words, 'player', 'computer' or 'tie', in lowercase letters." },
      { expr: py`all(val('get_winner(%r, %r)' % (p, c)) == w for p, c, w in [('rock','rock','tie'), ('rock','paper','computer'), ('rock','scissors','player'), ('paper','rock','player'), ('paper','paper','tie'), ('paper','scissors','computer'), ('scissors','rock','computer'), ('scissors','paper','player'), ('scissors','scissors','tie')])`,
        hint: "Check get_winner for every pair of moves: rock beats scissors, scissors beats paper, paper beats rock, and the same move is a 'tie'." },
      { expr: py`(lambda w: (rerun(patches={'random.choice': w[0]}), len(w[1]) >= 5)[1])(rec('random.choice'))`,
        hint: "Pick the computer's move with random.choice inside your loop, so it picks again every round." },
      // The count above passed random.choice(["rock", "paper"]), which never plays scissors (r2_choice_two_moves).
      // At least 5 of the calls must pick from all 3 moves, so another random.choice, such as for a taunt, is fine.
      { expr: py`(lambda w: (rerun(patches={'random.choice': w[0]}), len([a for a in w[1] if a and sorted(str(x).lower() for x in a[0]) == ['paper', 'rock', 'scissors']]) >= 5)[1])(rec('random.choice'))`,
        hint: "Pick the computer's move with random.choice(['rock', 'paper', 'scissors']), so it can play any of the 3 moves." },
      { expr: py`(lambda t: (lambda k: len(k) >= 5 and numset([4, 0], L=t[k[4] + 1:]))([j for j, l in enumerate(t) if re.search(r'(?i)\b(win|wins|won|winner|tie|draw|lose|loses|lost)\b|\b(player|computer|tie)\W*$', l)]))(rerun(patches={'random.choice': seq(['scissors', 'rock', 'paper', 'scissors', 'paper'])})[0])`,
        hint: "When I picked the computer's moves, your final score was wrong: add 1 to the winner's score every round." },
      // The same with the computer winning rounds 1-4, so a computer_wins that never goes up fails
      // (r2_no_computer_count). A '-' between digits is read as a dash, so 'Score: 0-4' isn't a score of -4.
      { expr: py`(lambda t: (lambda k: len(k) >= 5 and numset([0, 4], L=[re.sub(r'(?<=\d)-', ' ', l) for l in t[k[4] + 1:]]))([j for j, l in enumerate(t) if re.search(r'(?i)\b(win|wins|won|winner|tie|draw|lose|loses|lost)\b|\b(player|computer|tie)\W*$', l)]))(rerun(patches={'random.choice': seq(['paper', 'scissors', 'rock', 'paper', 'paper'])})[0])`,
        hint: "When I made the computer win 4 rounds, your final score was wrong: add 1 to the computer's score when it wins a round." },
      // Lines saying the computer won ("Computer wins", "Winner: computer", "You lose", "-> computer"), counted in
      // that 4-0-1 game and in one where every round is a tie: a right answer has no more of them in the first
      // than in the second, where nobody wins, so a rules line such as "If you lose, try again" cancels out.
      // Scores such as "Computer wins: 0" or "won only 1" don't count as claims.
      { expr: py`(lambda CC: len([l for l in rerun(patches={'random.choice': seq(['scissors', 'rock', 'paper', 'scissors', 'paper'])})[0] if CC(l)]) <= len([l for l in rerun(patches={'random.choice': seq(['rock', 'paper', 'scissors', 'rock', 'paper'])})[0] if CC(l)]))(lambda l: bool(re.search(r"(?i)(?<!if )(?<!when )(?<!if the )(?<!when the )(?<!neither )(?<!no )\b(computer|cpu)\b\W*(is\W+|s\W+|was\W+|has\W+)?(the\W+)?(overall\W+|big\W+|grand\W+)?(wins|won|win|champion|winner|victorious)\b(?!\W*(\d|no\b|none|zero|only\b|just\b))|\b(champion|winner)\b\W*(is\W*)?(the\W+)?(computer|cpu)\b|(?<!if )(?<!when )(?<!if the )(?<!when the )\byou\W+(lose|lost)\b(?!\W*(\d|no\b|none|zero|only\b|just\b))|(:|->|=>|→)\s*(the\s+)?(computer|cpu)\W*$", l)) and not re.search(r"(?i)(?<!if )(?<!when )(?<!if the )(?<!when the )(?<!neither )(?<!no )\b(you|player)\b\W*(are\W+|re\W+|is\W+|s\W+|were\W+|was\W+|have\W+|has\W+)?(the\W+)?(overall\W+|big\W+|grand\W+)?(wins|won|win|champion|winner|victorious)\b(?!\W*(\d|no\b|none|zero|only\b|just\b))|\b(champion|winner)\b\W*(is\W*)?(the\W+)?(you|player)\b|(?<!if )(?<!when )(?<!if the )(?<!when the )\byou\W+beat\b|(?<!if )(?<!when )(?<!if the )(?<!when the )\b(computer|cpu)\W+(loses|lost)\b(?!\W*(\d|no\b|none|zero|only\b|just\b))|(:|->|=>|→)\s*(the\s+)?(you|player)\W*$", l))`,
        hint: "When you won 4 rounds and tied 1, your program said the computer won something, so check the order of the moves you give get_winner(player, computer)." },
      // Task step 7's champion, in the lines after the 5th result line: when the computer wins rounds 1-4 and ties
      // round 5, nothing there may say you won (r2_champion_always_you), and when every round is a tie, nothing may
      // say either side won (r2_champion_ties_to_you). The claims are those of the probe above, turned round for
      // the player, but not after 'if' or 'when' ("Play again to see if you win!"). Scores such as "You won 0
      // rounds" don't count as claims.
      { expr: py`(lambda PC, R: (lambda t: (lambda k: len(k) >= 5 and not any(PC(l) for l in t[k[4] + 1:]))(R(t)))(rerun(patches={'random.choice': seq(['paper', 'scissors', 'rock', 'paper', 'paper'])})[0]))(lambda l: bool(re.search(r"(?i)(?<!if )(?<!when )(?<!if the )(?<!when the )(?<!neither )(?<!no )\b(you|player)\b\W*(are\W+|re\W+|is\W+|s\W+|were\W+|was\W+|have\W+|has\W+)?(the\W+)?(overall\W+|big\W+|grand\W+)?(wins|won|win|champion|winner|victorious)\b(?!\W*(\d|no\b|none|zero|only\b|just\b))|\b(champion|winner)\b\W*(is\W*)?(the\W+)?(you|player)\b|(?<!if )(?<!when )(?<!if the )(?<!when the )\byou\W+beat\b|(?<!if )(?<!when )(?<!if the )(?<!when the )\b(computer|cpu)\W+(loses|lost)\b(?!\W*(\d|no\b|none|zero|only\b|just\b))|(:|->|=>|→)\s*(the\s+)?(you|player)\W*$", l)) and not re.search(r"(?i)(?<!if )(?<!when )(?<!if the )(?<!when the )(?<!neither )(?<!no )\b(computer|cpu)\b\W*(is\W+|s\W+|was\W+|has\W+)?(the\W+)?(overall\W+|big\W+|grand\W+)?(wins|won|win|champion|winner|victorious)\b(?!\W*(\d|no\b|none|zero|only\b|just\b))|\b(champion|winner)\b\W*(is\W*)?(the\W+)?(computer|cpu)\b|(?<!if )(?<!when )(?<!if the )(?<!when the )\byou\W+(lose|lost)\b(?!\W*(\d|no\b|none|zero|only\b|just\b))|(:|->|=>|→)\s*(the\s+)?(computer|cpu)\W*$", l), lambda t: [j for j, l in enumerate(t) if re.search(r'(?i)\b(win|wins|won|winner|tie|draw|lose|loses|lost)\b|\b(player|computer|tie)\W*$', l)])`,
        hint: "When the computer won more rounds than you, your program still said you were the champion: pick the champion by comparing the two scores." },
      { expr: py`(lambda PC, CC, R: (lambda t: (lambda k: len(k) >= 5 and not any(PC(l) or CC(l) for l in t[k[4] + 1:]))(R(t)))(rerun(patches={'random.choice': seq(['rock', 'paper', 'scissors', 'rock', 'paper'])})[0]))(lambda l: bool(re.search(r"(?i)(?<!if )(?<!when )(?<!if the )(?<!when the )(?<!neither )(?<!no )\b(you|player)\b\W*(are\W+|re\W+|is\W+|s\W+|were\W+|was\W+|have\W+|has\W+)?(the\W+)?(overall\W+|big\W+|grand\W+)?(wins|won|win|champion|winner|victorious)\b(?!\W*(\d|no\b|none|zero|only\b|just\b))|\b(champion|winner)\b\W*(is\W*)?(the\W+)?(you|player)\b|(?<!if )(?<!when )(?<!if the )(?<!when the )\byou\W+beat\b|(?<!if )(?<!when )(?<!if the )(?<!when the )\b(computer|cpu)\W+(loses|lost)\b(?!\W*(\d|no\b|none|zero|only\b|just\b))|(:|->|=>|→)\s*(the\s+)?(you|player)\W*$", l)) and not re.search(r"(?i)(?<!if )(?<!when )(?<!if the )(?<!when the )(?<!neither )(?<!no )\b(computer|cpu)\b\W*(is\W+|s\W+|was\W+|has\W+)?(the\W+)?(overall\W+|big\W+|grand\W+)?(wins|won|win|champion|winner|victorious)\b(?!\W*(\d|no\b|none|zero|only\b|just\b))|\b(champion|winner)\b\W*(is\W*)?(the\W+)?(computer|cpu)\b|(?<!if )(?<!when )(?<!if the )(?<!when the )\byou\W+(lose|lost)\b(?!\W*(\d|no\b|none|zero|only\b|just\b))|(:|->|=>|→)\s*(the\s+)?(computer|cpu)\W*$", l), lambda l: bool(re.search(r"(?i)(?<!if )(?<!when )(?<!if the )(?<!when the )(?<!neither )(?<!no )\b(computer|cpu)\b\W*(is\W+|s\W+|was\W+|has\W+)?(the\W+)?(overall\W+|big\W+|grand\W+)?(wins|won|win|champion|winner|victorious)\b(?!\W*(\d|no\b|none|zero|only\b|just\b))|\b(champion|winner)\b\W*(is\W*)?(the\W+)?(computer|cpu)\b|(?<!if )(?<!when )(?<!if the )(?<!when the )\byou\W+(lose|lost)\b(?!\W*(\d|no\b|none|zero|only\b|just\b))|(:|->|=>|→)\s*(the\s+)?(computer|cpu)\W*$", l)) and not re.search(r"(?i)(?<!if )(?<!when )(?<!if the )(?<!when the )(?<!neither )(?<!no )\b(you|player)\b\W*(are\W+|re\W+|is\W+|s\W+|were\W+|was\W+|have\W+|has\W+)?(the\W+)?(overall\W+|big\W+|grand\W+)?(wins|won|win|champion|winner|victorious)\b(?!\W*(\d|no\b|none|zero|only\b|just\b))|\b(champion|winner)\b\W*(is\W*)?(the\W+)?(you|player)\b|(?<!if )(?<!when )(?<!if the )(?<!when the )\byou\W+beat\b|(?<!if )(?<!when )(?<!if the )(?<!when the )\b(computer|cpu)\W+(loses|lost)\b(?!\W*(\d|no\b|none|zero|only\b|just\b))|(:|->|=>|→)\s*(the\s+)?(you|player)\W*$", l), lambda t: [j for j, l in enumerate(t) if re.search(r'(?i)\b(win|wins|won|winner|tie|draw|lose|loses|lost)\b|\b(player|computer|tie)\W*$', l)])`,
        hint: "When every round was a tie, your program still named a champion, but equal scores mean nobody is the champion." },
      // And when the player wins rounds 1-4 and ties round 5, the lines after the 5th result must say something
      // other than when every round is a tie, once the numbers are left out: a champion picked from the last
      // round's winner, or scores compared with a typo (player_wins > player_wins), called that game a draw
      // (r3_champion_last_round, r3_typo_compare). Claim words aren't needed, so "Player defeats Computer" is fine.
      { expr: py`(lambda R: (lambda M: M(rerun(patches={'random.choice': seq(['scissors', 'rock', 'paper', 'scissors', 'paper'])})[0]) != M(rerun(patches={'random.choice': seq(['rock', 'paper', 'scissors', 'rock', 'paper'])})[0]))(lambda t: (lambda k: [re.sub(r'\d+', '#', l) for l in t[k[4] + 1:]] if len(k) >= 5 else None)(R(t))))(lambda t: [j for j, l in enumerate(t) if re.search(r'(?i)\b(win|wins|won|winner|tie|draw|lose|loses|lost)\b|\b(player|computer|tie)\W*$', l)])`,
        hint: "When you won more rounds than the computer, your program didn't name you the champion: pick the champion by comparing the two scores." },
      { expr: py`(lambda w: (rerun(patches={'random.seed': w[0]}), (42,) in w[1])[1])(rec('random.seed'))`,
        hint: "Keep random.seed(42) at the top of your program, as the task says." },
    ],
  },
  grind_16: {
    output: [{ expr: py`has('Will I win?', 'Is it sunny?', 'Should I go?')`, hint: "Print each of the 3 questions, in order." }],
    probes: [
      // The lists as the program first sets them, or as they end up: popping each question off the list as it is
      // asked leaves questions empty at the end (r3_pop_questions), and shuffling responses reorders it
      // (r3_shuffle_index), though both lists were made exactly as the task shows.
      { expr: py`(lambda A: (A('responses') == ['Yes!', 'No!', 'Maybe', 'Ask again'] or ns.get('responses') == ['Yes!', 'No!', 'Maybe', 'Ask again']) and (A('questions') == ['Will I win?', 'Is it sunny?', 'Should I go?'] or ns.get('questions') == ['Will I win?', 'Is it sunny?', 'Should I go?']))(lambda n: next(([e.value for e in s.value.elts] for s in TREE.body if isinstance(s, ast.Assign) and any(isinstance(t, ast.Name) and t.id == n for t in s.targets) and isinstance(s.value, ast.List) and all(isinstance(e, ast.Constant) for e in s.value.elts)), None))`,
        hint: "Make the two lists exactly as the task shows: responses with 4 answers and questions with 3 questions." },
      // A different answer each time, not the prototype's "always Maybe", which picking once also passes (choice_once).
      { expr: py`has('Will I win?', 'Yes!', 'Is it sunny?', 'No!', 'Should I go?', 'Ask again', L=rerun(patches={'random.choice': seq(['Yes!', 'No!', 'Ask again'])})[0])`,
        hint: "Pick a new random.choice(responses) for each question inside your loop, and print it after the question." },
      // The probe above scripts random.choice, so what it picks from was never looked at: an inline list with
      // only 2 of the answers passed (r1_inline_list). Every call must get the 4 responses.
      { expr: py`(lambda w: (rerun(patches={'random.choice': w[0]}), len(w[1]) >= 3 and all(list(a[0]) == ['Yes!', 'No!', 'Maybe', 'Ask again'] for a in w[1]))[1])(rec('random.choice'))`,
        hint: "Pick each answer with random.choice(responses), so all 4 answers can come up." },
      { expr: py`(lambda w: (rerun(patches={'random.seed': w[0]}), (42,) in w[1])[1])(rec('random.seed'))`,
        hint: "Keep random.seed(42) at the top of your program, as the task says." },
      // The probes above script random.choice and only look for a seed call, so random.seed(42) inside the loop,
      // which gives every question the same answer, passed (r2_seed_in_loop). No seed call may come after the
      // first random.choice.
      { expr: py`(lambda log, sd, ch: (rerun(patches={'random.seed': lambda *a, **k: (log.append('seed'), sd(*a, **k))[1], 'random.choice': lambda *a, **k: (log.append('choice'), ch(*a, **k))[1]}), 'choice' in log and 'seed' not in log[log.index('choice'):])[1])([], rec('random.seed')[0], rec('random.choice')[0])`,
        hint: "Call random.seed(42) once at the top, not inside your loop, so each question can get a different answer." },
    ],
  },
  // content bug: seed 42 makes the secret 4, below every guess, so the reference prints 'Too high' 5 times and
  // 'Correct!' and the break never run. The rule accepts that, and the probes patch in other secrets to test them.
  // The prototype counted every printed line, which rejected a heading line (ALT_header_while); these
  // count only the hint lines.
  // The hint words must be written as the task writes them: 'Too high' at the start of a line, or 'too high' after
  // other words ("10 is too high", C_sentence_while). The prototype's (?i) let 'TOO HIGH' pass (r2_caps_hints), which
  // now gets a near-miss hint of its own. \b keeps 'Incorrect' from reading as 'Correct'.
  // H reads each line's hint word. 'correct' after a negative word isn't one, so a for-else line 'None of your
  // guesses were correct.' is fine (r3_none_correct), and neither is 'correct' before a noun ('The correct number
  // was 4').
  grind_17: {
    output: [
      { expr: py`(lambda H: len(H(L, r'(?i)\b(too high|too low|correct(?!\s+(?:number|answer|secret|guess|one)\b))\b')) == len(H(L, r'\b(Too high|Too low|Correct(?!\s+(?:number|answer|secret|guess|one)\b))\b|(?<=\S\s)\b(too high|too low|correct(?!\s+(?:number|answer|secret|guess|one)\b))\b')))(lambda t, pat: [m.group().lower() for m, l in ((re.search(pat, l), l) for l in t) if m and not (m.group().lower() == 'correct' and re.search(r"(?i)\b(not|none|no|never|nothing)\b|n[’']t\b", l[:m.start()]))])`,
        hint: "So close! Check the capital letters in your hint lines: they should say 'Too high', 'Too low' or 'Correct!', just like that." },
      { expr: py`(lambda H: H(L, r'\b(Too high|Too low|Correct(?!\s+(?:number|answer|secret|guess|one)\b))\b|(?<=\S\s)\b(too high|too low|correct(?!\s+(?:number|answer|secret|guess|one)\b))\b') == ['too high'] * 5)(lambda t, pat: [m.group().lower() for m, l in ((re.search(pat, l), l) for l in t) if m and not (m.group().lower() == 'correct' and re.search(r"(?i)\b(not|none|no|never|nothing)\b|n[’']t\b", l[:m.start()]))])`,
        hint: "Compare each guess with the secret number and print 'Too high', 'Too low' or 'Correct!'." },
    ],
    // The probes leave capitals to the near-miss check above, so a near miss gets only that hint.
    probes: [
      { expr: py`(lambda H: H(rerun(patches={'random.randint': lambda a, b: 12})[0], r'(?i)\b(too high|too low|correct(?!\s+(?:number|answer|secret|guess|one)\b))\b') == ['too low', 'too low', 'too high', 'correct'])(lambda t, pat: [m.group().lower() for m, l in ((re.search(pat, l), l) for l in t) if m and not (m.group().lower() == 'correct' and re.search(r"(?i)\b(not|none|no|never|nothing)\b|n[’']t\b", l[:m.start()]))])`,
        hint: "When I changed the secret number, your hints were wrong. Print 'Correct!' when the guess equals the secret, then stop the loop with break." },
      { expr: py`(lambda H: H(rerun(patches={'random.randint': lambda a, b: 10})[0], r'(?i)\b(too high|too low|correct(?!\s+(?:number|answer|secret|guess|one)\b))\b') == ['correct'])(lambda t, pat: [m.group().lower() for m, l in ((re.search(pat, l), l) for l in t) if m and not (m.group().lower() == 'correct' and re.search(r"(?i)\b(not|none|no|never|nothing)\b|n[’']t\b", l[:m.start()]))])`,
        hint: "When the first guess is right, print 'Correct!' and stop: nothing should be printed after it." },
      // The probes above replace randint, so its range was never looked at: randint(1, 10) passed, since seed 42
      // happens to give a secret below every guess there too (r1_range10).
      { expr: py`(lambda w: (rerun(patches={'random.randint': w[0]}), (1, 20) in w[1])[1])(rec('random.randint'))`,
        hint: "Pick the secret number with random.randint(1, 20), as the task says." },
    ],
  },

  // ---------- Chapter 10 ----------
  ch10_r1: {
    // Split in two, so a run_quiz that returns inside its loop, after question 1, isn't told to fix setup_quiz
    // (r1_return_in_loop).
    output: [
      { expr: py`isinstance(val('setup_quiz()'), list)`, hint: "Make setup_quiz() return a list of your 3 questions." },
      { expr: py`all(d['q'] in out for d in val('setup_quiz()'))`,
        hint: "Print every question from setup_quiz() as you ask it, and let run_quiz finish its loop before it returns the score." },
    ],
    probes: [
      { expr: py`(lambda qs: isinstance(qs, list) and len(qs) == 3 and all(isinstance(d, dict) and {'q', 'a'} <= set(d) for d in qs))(val('setup_quiz()'))`,
        hint: "setup_quiz() should return a list of 3 dictionaries, each with a 'q' (the question) and an 'a' (the answer)." },
      { expr: py`(lambda r: r[0] == 'Yan' and any('Zed?' in l for l in r[1]))(callf('ask_question', {'q': 'Zed?', 'a': 'Yan'}))`,
        hint: "ask_question(question) should print question['q'] and return question['a']." },
      { expr: py`callf('run_quiz', [{'q': 'Q1', 'a': '1'}, {'q': 'Q2', 'a': '2'}])[0] == 2`,
        hint: "run_quiz(questions) should ask every question, add up the score, and return it." },
      { expr: py`numset([1, 4, 25], L=callf('show_results', 1, 4)[1])`,
        hint: "show_results(score, total) should print the score, the total and the percentage: 1 out of 4 is 25%." },
      { expr: py`all(f in trace for f in ('setup_quiz', 'ask_question', 'run_quiz', 'show_results'))`,
        hint: "Use all four functions to run the quiz: setup_quiz, then run_quiz (which calls ask_question), then show_results." },
    ],
  },
  ch10_r2: {
    // Every question must be shown: a loop over range(2) whose third answer was wrong anyway still printed
    // 2/3 (r1_two_questions). The score is read from the last line with a number that says score, points,
    // total, right or correct, or else the last line with a number: the prototype wanted "<score> ... 3" on
    // the last line, but the task never says "out of 3" (r1_score_no_total) or "last line" (r1_thanks_after).
    // Percentages are taken out first, so "That's 67% correct!" after the score isn't read as one (r2_percent_after).
    output: [
      { expr: py`isinstance(ns.get('questions'), list) and len(ns['questions']) == 3 and all(isinstance(q, dict) and isinstance(q.get('q'), str) and has(q['q']) for q in ns['questions'])`,
        hint: "Make 3 questions, and print every one of them as your loop asks it." },
      { expr: py`(lambda c, T: nums([c], L=[l for l in T if re.search(r'\d', l) and re.search(r'(?i)score|points?|total|right|correct', l)][-1:]) or nums([c], L=[l for l in T if re.search(r'\d', l)][-1:]))(sum(a == q['answer'] for a, q in zip(ns['simulated_answers'], ns['questions'])), [re.sub(r'\d+(\.\d+)?\s*%', '', l) for l in L])`,
        hint: "At the end, print the final score, counting only the simulated answers that are right." },
    ],
    probes: [
      { expr: py`all(isinstance(q, dict) and isinstance(q.get('choices'), list) and type(q.get('answer')) is int and 'q' in q for q in ns.get('questions', [0]))`,
        hint: "Each question should be a dictionary with 'q', a 'choices' list, and an 'answer' that is the number (index) of the right choice." },
      // The task says display_question prints "the question and numbered choices", not num: the prototype wanted
      // the 7 as well, which rejected a loop that prints the question number itself (r2_num_unused).
      { expr: py`(lambda t: 'Zed?' in t and all(c in t for c in ['Ann', 'Bo', 'Cy']))('\n'.join(callf('display_question', {'q': 'Zed?', 'choices': ['Ann', 'Bo', 'Cy'], 'answer': 2}, 7)[1]))`,
        hint: "display_question(q, num) should print the question and every one of its choices." },
      { expr: py`callf('check_answer', {'q': 'Z', 'choices': ['a', 'b', 'c'], 'answer': 2}, 2)[0] is True and callf('check_answer', {'q': 'Z', 'choices': ['a', 'b', 'c'], 'answer': 2}, 0)[0] is False`,
        hint: "check_answer(q, player_choice) should return True when player_choice equals q['answer'], and False when it doesn't." },
      // The output check works the expected score out from the program's own questions, so a final score typed in
      // as print('Final score: 2/3') passed (r3_hardcoded_final). Here the first simulated answer is right and the
      // others wrong (a score of 1), or, when the program already scored 1, the first two are right (2): never 3,
      // which the '/3' of a typed-in score would show. The score is read as in the output check.
      { expr: py`(lambda qs, c: (lambda want: (lambda T: nums([want], L=[l for l in T if re.search(r'\d', l) and re.search(r'(?i)score|points?|total|right|correct', l)][-1:]) or nums([want], L=[l for l in T if re.search(r'\d', l)][-1:]))([re.sub(r'\d+(\.\d+)?\s*%', '', l) for l in rerun({'simulated_answers': repr([q['answer'] if i < want else (q['answer'] + 1) % len(q['choices']) for i, q in enumerate(qs)])})[0]]))(2 if c == 1 else 1))(ns['questions'], sum(a == q['answer'] for a, q in zip(ns['simulated_answers'], ns['questions'])))`,
        hint: "When I changed simulated_answers, your final score didn't change with them: add to the score as your loop checks each answer." },
    ],
  },
  ch10_r3: {
    // The prototype read every line naming potion, arrow or sword, so add_item and remove_item messages such
    // as "Added 3 potion" broke it (ALT_messages). Instead, what the kid's own show_inventory prints for the
    // two expected inventories must appear, in order; a probe below checks that it shows the counts.
    output: [
      // First, so a show_inventory that prints the global inventory, and so shows the same thing for both
      // dictionaries, hears about that rather than about the test steps it got right (r2_show_uses_global).
      { expr: py`(lambda a, b: a != b or not a)(callf('show_inventory', {'potion': 3, 'sword': 1, 'arrow': 2})[1], callf('show_inventory', {'potion': 2, 'sword': 1})[1])`,
        hint: "show_inventory(inv) should print the inventory it is given as inv, not the global inventory." },
      // The task never names the keys, so the two inventories are made with the program's own names for the items:
      // those left in inventory, or else a string in the program that is the item's name with any capitals and an
      // 's' on the end ('Potion', 'arrows'), or else the lowercase name (r3_capital_keys, r3_plural_keys).
      { expr: py`(lambda N: (lambda a, b: len(a) > 0 and len(b) > 0 and subseq(a + b))(callf('show_inventory', {N('potion'): 3, N('sword'): 1, N('arrow'): 2})[1], callf('show_inventory', {N('potion'): 2, N('sword'): 1})[1]))(lambda w: next((k for k in (list(ns['inventory']) if isinstance(ns.get('inventory'), dict) else []) + str_consts() if isinstance(k, str) and re.fullmatch(r'(?i)%ss?' % w, k)), w))`,
        hint: "Show the inventory twice: after adding 3 potions, 1 sword and 2 arrows, and again after removing 1 potion and 2 arrows." },
    ],
    probes: [
      // Keys are compared with capitals and a plural 's' ignored, as above (r3_capital_display_only).
      { expr: py`isinstance(ns.get('inventory'), dict) and len(ns['inventory']) == 2 and {(re.sub(r's$', '', k.lower()) if isinstance(k, str) else k): v for k, v in ns['inventory'].items()} == {'potion': 2, 'sword': 1}`,
        hint: "After your test, inventory should hold 2 potions and 1 sword, and no arrows at all." },
      { expr: py`(lambda d: (callf('add_item', d, 'x'), callf('add_item', d, 'x', 2), d == {'x': 3})[2])({})`,
        hint: "add_item should add to the count when the item is already there, and add 1 when no qty is given." },
      { expr: py`(lambda d: (callf('remove_item', d, 'x', 2), d == {})[1])({'x': 2})`,
        hint: "remove_item should take away qty, and delete the item with del when its count reaches 0." },
      // The program always gives remove_item a qty, so a remove_item(inv, item, qty) with no default passed
      // (r2_remove_no_default).
      { expr: py`(lambda d: (callf('remove_item', d, 'x'), d == {'x': 1})[1])({'x': 2})`,
        hint: "remove_item should take away 1 when no qty is given, so give qty a default: qty=1." },
      // The output check above is format-free, so this makes show_inventory show the counts (names_only). As the
      // prototype did, any number on a line naming the item counts, so 'Item: potion, Qty: 3', 'potions: 3' and
      // print(inv) all pass (ALT_item_qty, ALT_plural, ALT_print_dict).
      { expr: py`(lambda t: all(any(i in l.lower() and n in ints(l) for l in t) for i, n in (('potion', 3), ('arrow', 2))))(callf('show_inventory', {'potion': 3, 'arrow': 2})[1])`,
        hint: "show_inventory should print each item of the inventory it is given with its count, like 'potion: 3'." },
      { expr: py`any('Empty!' in l for l in callf('show_inventory', {})[1])`,
        hint: "show_inventory should print 'Empty!' when there is nothing in the inventory." },
      // "or" in the task: 'Empty!' printed after the items every time passed the checks above (r1_empty_always).
      { expr: py`not any(re.search(r'(?i)\bempty\b', l) for l in callf('show_inventory', {'potion': 3})[1])`,
        hint: "show_inventory should print 'Empty!' only when the inventory has nothing in it, not after the items." },
    ],
  },
  ch10_r4: {
    output: [{ expr: py`len(L) >= 3`, hint: "Print the story as it happens: the start, the cave, and how the adventure ends." }],
    probes: [
      { expr: py`'scene_start' in trace and 'scene_left' in trace and 'scene_right' not in trace and trace.index('scene_start') < trace.index('scene_left')`,
        hint: "Run your adventure by calling scene_start(), then scene_left() because the first choice is 'left'. Don't call scene_right() on this path." },
      // Two choices, as in the task's list: with only ['right'], reading choices[1] up front raised IndexError
      // (r1_preread).
      // A near miss first: 'Treasure found!' only differs in its capitals (r2_capital_treasure), and 'treasure found'
      // in its punctuation (r3_treasure_no_bang).
      { expr: py`(lambda t: any('treasure found!' in l for l in t) or not any('treasure found' in l.lower() for l in t))(rerun({'choices': "['right', 'fight']"})[0])`,
        hint: "So close! Check the capital letters and punctuation in what scene_right() returns: it should be exactly 'treasure found!'." },
      { expr: py`(lambda r: 'scene_right' in r[1].trace and 'scene_left' not in r[1].trace and any('treasure found!' in l for l in r[0]))(rerun({'choices': "['right', 'fight']"}))`,
        hint: "When the first choice is 'right', your story should go to scene_right() and print what it returns." },
      { expr: py`rerun({'choices': "['left', 'sneak']"})[0] != L`,
        hint: "When the second choice is 'sneak' instead of 'fight', your story should end differently." },
    ],
  },
  ch10_r5: {
    output: [{ expr: py`nums([70, 50, 45]) and has('Iron Sword') and numset([45, 15, 50], L=L[3:])`,
      hint: "Show HP 70 after the first hit, the Iron Sword and 50 gold, HP 45 after the second hit, then the full status." }],
    probes: [
      { expr: py`ns.get('player') == {'name': 'Hero', 'hp': 45, 'attack': 15, 'inventory': ['Iron Sword'], 'gold': 50}`,
        hint: "Your functions should change the player dictionary, so at the end it has hp 45, the Iron Sword and 50 gold." },
      // "not" rather than the prototype's "is False": the task says "return True if alive", and returning
      // nothing once hp runs out does that (ALT_implicit_false). An error comes back as a tuple, which still fails.
      { expr: py`callf('take_damage', {'name': 'Z', 'hp': 10, 'attack': 1, 'inventory': [], 'gold': 0}, 3)[0] is True and not callf('take_damage', {'name': 'Z', 'hp': 10, 'attack': 1, 'inventory': [], 'gold': 0}, 30)[0]`,
        hint: "take_damage should return True while hp is above 0, and False when the hero runs out of hp." },
      // Exactly 0 hp is not alive: hp >= 0 passed the 3 and 30 damage above (r1_ge_zero).
      { expr: py`not callf('take_damage', {'name': 'Z', 'hp': 10, 'attack': 1, 'inventory': [], 'gold': 0}, 10)[0]`,
        hint: "A hero with exactly 0 hp is out of the fight, so take_damage should return False then too." },
      // The simulation finds loot once, on an empty inventory and 0 gold, so replacing either passed
      // (r1_inventory_replace, r1_gold_assign).
      { expr: py`(lambda s: (callf('find_loot', s, 'Rope', 5), s['inventory'] == ['Map', 'Rope'])[1])({'name': 'Z', 'hp': 10, 'attack': 1, 'inventory': ['Map'], 'gold': 10})`,
        hint: "find_loot should append the item to the inventory list, keeping the items already there." },
      { expr: py`(lambda s: (callf('find_loot', s, 'Rope', 5), s['gold'] == 15)[1])({'name': 'Z', 'hp': 10, 'attack': 1, 'inventory': ['Map'], 'gold': 10})`,
        hint: "find_loot should add the gold to what the player already has, not replace it." },
      // show_status was only ever called with the player, so one that prints player[...] instead of state[...]
      // passed (r2_status_global).
      { expr: py`numset([77, 33, 99], L=callf('show_status', {'name': 'Zed', 'hp': 77, 'attack': 33, 'inventory': ['Rope'], 'gold': 99})[1])`,
        hint: "show_status(state) should print the stats of the dictionary it is given, not always the player's." },
      // "print all stats formatted": print(state) shows the raw dictionary (r3_status_raw_dict).
      { expr: py`not any(l.strip().startswith('{') for l in callf('show_status', {'name': 'Zed', 'hp': 77, 'attack': 33, 'inventory': ['Rope'], 'gold': 99})[1])`,
        hint: "show_status should print each stat in a friendly format, like 'HP: 45', instead of printing the whole dictionary at once." },
    ],
  },
  ch10_s1: {
    // A count may come before its rarity too ("6 common"): the prototype only allowed "common: 6" (ALT_number_first).
    // No \b is needed between a count and what comes before it, so "Common x6" counts (r1_x_counts). The drops
    // are any 10 lines in a row naming an item, so the loot table printed first doesn't count as drops 1-4
    // (r1_show_table_first): the prototype took the first 10 such lines.
    output: [{ expr: py`(lambda R: (lambda drops, rest: len(drops) >= 10 and any(all((lambda c: any(re.search(r'(?i)\b%s\b\D*(?<!\d)%d(?!\d)|(?<!\d)%d\W+%s\b' % (r, c, c, r), s) for s in rest))(sum(R[[n for n in R if n in d][0]] == r for d in drops[i:i + 10])) for r in ('common', 'rare', 'legendary')) for i in range(len(drops) - 9)))([l for l in L if any(n in l for n in R)], [l for l in L if not any(n in l for n in R)]))({'Gold Coin': 'common', 'Health Potion': 'common', 'Magic Ring': 'rare', 'Dragon Scale': 'legendary'})`,
      hint: "Print each of the 10 drops with the item's name, then how many common, rare and legendary items you got." }],
    // The task never says what get_drop returns, so an item's name counts as well as the item itself, and its rarity
    // is looked up in the table (r3_returns_name).
    probes: [
      { expr: py`(lambda T: all((lambda v: v in T or any(isinstance(d, dict) and v == d.get('name') for d in T))(callf('get_drop', T)[0]) for _ in range(50)))(ns['loot_table'])`,
        hint: "get_drop(table) should return one of the items from the loot table." },
      // Before the odds, which random.seed(42) inside get_drop also gets wrong, since every drop is then the same,
      // though it rolls randint(1, 100) as the odds hint says (r3_seed_in_drop). No seed call may come after the
      // first randint, as in grind_16.
      { expr: py`(lambda log, sd, ri: (rerun(patches={'random.seed': lambda *a, **k: (log.append('seed'), sd(*a, **k))[1], 'random.randint': lambda *a, **k: (log.append('randint'), ri(*a, **k))[1]}), 'randint' not in log or 'seed' not in log[log.index('randint'):])[1])([], rec('random.seed')[0], rec('random.randint')[0])`,
        hint: "Call random.seed(42) once at the top of your program, not inside get_drop, so each drop can come out different." },
      { expr: py`(lambda T: (lambda rs: abs(rs.count('common') / 2000 - 0.6) < 0.05 and abs(rs.count('rare') / 2000 - 0.3) < 0.05 and abs(rs.count('legendary') / 2000 - 0.1) < 0.04)([(lambda v: v['rarity'] if isinstance(v, dict) else next((d['rarity'] for d in T if isinstance(d, dict) and d.get('name') == v), None))(callf('get_drop', T)[0]) for _ in range(2000)]))(ns['loot_table'])`,
        hint: "Use random.randint(1, 100) so common items drop about 60% of the time, rare 30% and legendary 10%." },
      // The odds above are the same with randint(1, 10) and thresholds 6 and 9 (r2_randint_1_10).
      { expr: py`(lambda w: (rerun(patches={'random.randint': w[0]}), (1, 100) in w[1])[1])(rec('random.randint'))`,
        hint: "Roll each drop with random.randint(1, 100), as the task says." },
    ],
  },
  ch10_s2: {
    // At least 5 lines naming an enemy, so a header listing the names or a closing "Watch out for the Goblin!"
    // is fine (r1_names_first, r1_strongest_summary); the prototype wanted exactly 5. The probes count the
    // generate_enemy calls instead.
    output: [
      { expr: py`len([l for l in L if any(n in l for n in ('Goblin', 'Skeleton', 'Troll', 'Ghost'))]) >= 5`,
        hint: "Print all 5 enemies, each with its name from the names list." },
      { expr: py`sum(61 <= v <= 70 for v in ints(out)) >= 5 and sum(10 <= v <= 14 for v in ints(out)) >= 5`,
        hint: "Print each enemy's hp and attack. At level 3, hp is 61 to 70 and attack is 10 to 14." },
    ],
    probes: [
      { expr: py`all((lambda e: e['name'] in ns['names'] and 61 <= e['hp'] <= 70 and 10 <= e['attack'] <= 14)(callf('generate_enemy', 3)[0]) for _ in range(200))`,
        hint: "generate_enemy(level) should return a dictionary with a random 'name' from names, plus 'hp' and 'attack'." },
      // The random name has its own check and hint, so a name picked once outside the function isn't told to
      // fix its level formulas (r1_name_once).
      { expr: py`len({callf('generate_enemy', 3)[0]['name'] for _ in range(200)}) >= 2`,
        hint: "Pick the name with random.choice inside generate_enemy, so each enemy can get a different name." },
      { expr: py`all(21 <= e['hp'] <= 30 and 4 <= e['attack'] <= 8 for e in [callf('generate_enemy', 1)[0] for _ in range(200)])`,
        hint: "Use the level in your formulas, so a level 1 enemy is weaker than a level 3 one." },
      { expr: py`trace.count('generate_enemy') == 5`, hint: "Call generate_enemy(3) once for each of the 5 enemies." },
    ],
  },
  ch10_s3: {
    // Each line needs the name and the score in either order: the task only says "formatted as a leaderboard",
    // and the prototype's name-first pattern rejected '#1  1200 pts  Bob' (r2_score_first).
    output: [{ expr: py`subseq([r're:(?=.*\bBob\b)(?=.*\b1200\b).*', r're:(?=.*\bEve\b)(?=.*\b1100\b).*', r're:(?=.*\bDave\b)(?=.*\b950\b).*']) and 'Alice' not in out and 'Carol' not in out`,
      hint: "Show only the top 3 scores, highest first, with each name and score." }],
    probes: [
      { expr: py`[d.get('score') for d in ns.get('scores', [])] == [1200, 1100, 950, 850, 650]`,
        hint: "add_score should keep the scores list sorted from highest to lowest. Use table.sort() so the list itself changes." },
      { expr: py`(lambda t: (callf('add_score', t, 'Z', 5), callf('add_score', t, 'Y', 9), [d['score'] for d in t] == [9, 5])[2])([])`,
        hint: "add_score(table, name, score) should add a {'name': ..., 'score': ...} dictionary and then sort the table." },
      { expr: py`sig('show_top') == (2, 1) and (lambda t: len([l for l in callf('show_top', t, 1)[1] if 'A1' in l or 'B2' in l]) == 1)([{'name': 'A1', 'score': 2}, {'name': 'B2', 'score': 1}])`,
        hint: "show_top(table, n=3) should print only the top n entries, and n should be 3 when you don't give it." },
      // sig only counts defaults, and the program calls show_top(scores, 3), so n=5 passed (r1_default_5).
      { expr: py`(lambda t: len([l for l in callf('show_top', t)[1] if any(x in l for x in ('A1', 'B2', 'C3', 'D4'))]) == 3)([{'name': 'A1', 'score': 4}, {'name': 'B2', 'score': 3}, {'name': 'C3', 'score': 2}, {'name': 'D4', 'score': 1}])`,
        hint: "When show_top(table) is called without n, it should show the top 3, so give n a default of 3." },
    ],
  },
  ch10_boss: {
    output: [{ expr: py`(lambda R: (lambda a, b: has(R['start']['desc'], R[a]['desc'], R[b]['desc']))(R['start']['exits']['north'], R[R['start']['exits']['north']]['exits']['north']))(ns['rooms'])`,
      hint: "Each 'look' should print the room's desc, so the story shows every room as you walk north." }],
    probes: [
      { expr: py`isinstance(ns.get('rooms'), dict) and len(ns['rooms']) >= 3 and all({'desc', 'exits'} <= set(r) for r in ns['rooms'].values())`,
        hint: "rooms should have at least 3 rooms, and each room needs a 'desc' and an 'exits' dictionary." },
      { expr: py`'sword' in ns['player']['inventory'] and ns['player']['location'] == ns['rooms'][ns['rooms']['start']['exits']['north']]['exits']['north']`,
        hint: "After the playthrough, the player should be two rooms north of start, with 'sword' in their inventory." },
      // Also fails if move crashed: the prototype only looked at the location, which a move that raises
      // KeyError on a missing exit leaves alone too (no_exit_check). From start and from the room north of it, so
      // a move that sends the player to 'start' when there is no such exit fails (r3_move_default_start).
      { expr: py`all((lambda p: (lambda r: not (type(r[0]) is tuple and r[0][:1] == ('__error__',)) and p['location'] == loc)(callf('move', ns['rooms'], p, 'nowhere')))({'location': loc, 'inventory': [], 'hp': 50}) for loc in ('start', ns['rooms']['start']['exits']['north']))`,
        hint: "move should only change the player's location when that exit exists. Otherwise, leave them where they are." },
      // An inventory already holding something, and a list to compare with: player['inventory'] = item passed the
      // prototype's 'rope' in 'rope' (r1_pickup_assign).
      { expr: py`(lambda p: (callf('pickup', p, 'rope'), p['inventory'] == ['map', 'rope'])[1])({'location': 'start', 'inventory': ['map'], 'hp': 50})`,
        hint: "pickup(player, item) should append the item to the player['inventory'] list, keeping what is already there." },
    ],
  },
  grind_18: {
    output: [{ expr: py`nums([50, 40, 10])`, hint: "Buy the Sword, then the Potion, then the Shield, and print the gold left after each one." }],
    probes: [
      { expr: py`val("buy(items, 'Sword', 40)") == -1 and val("buy(items, 'Potion', 10)") == 0 and val("buy(items, 'Shield', 100)") == 70`,
        hint: "buy(items, name, gold) should return the gold left after paying, or -1 if the item costs more than the gold." },
      // With 55 gold, the Sword leaves 5, which the balance must show (r3_prints_price). The Potion and the Shield
      // can't be bought then, but the task never says what the balance should be when buy returns -1, and with its
      // 100 gold that never happens, so player_gold = buy(...) with no -1 check is fine (r2_assign_minus1): an
      // earlier rule rejected any -1 printed here.
      { expr: py`nums([5], L=rerun({'player_gold': '55'})[0])`,
        hint: "When I started with 55 gold, your program never showed the 5 gold left after the Sword: print the balance after each purchase." },
    ],
  },
  // The task asks only for each attack and the HP left, and to stop at 0 HP, so a winner line isn't required:
  // the prototype wanted one on the last line (r1_no_winner_line, r1_game_over). What is checked instead is that
  // the fight stops, and that a winner line, if there is one, names the right fighter. "The end" is from the
  // first line showing an HP of 0 or less.
  grind_19: {
    output: [
      { expr: py`nums([60, 85, 40, 70, 20, 55, 0])`, hint: "Print the HP after every attack, and keep taking turns until someone reaches 0." },
      // After the Dragon's 0, the Dragon must not attack again (Hero 40): a loop running while hp >= 0 went on
      // to Dragon -20 (r1_ge_loop).
      { expr: py`not nums([60, 85, 40, 70, 20, 55, 0, 40])`,
        hint: "Stop the battle as soon as someone's HP reaches 0: the Dragon can't attack once its HP is 0." },
      // The winner phrases are the prototype's, with "has", "has been" and "was" allowed ("The Dragon has been
      // defeated!", ALT_while_true) and "<winner> defeated the <loser>" (ALT_active_voice). The lookahead keeps
      // "The Dragon defeated the Hero" from reading as "Dragon defeated" (swapped_winner).
      { expr: py`(lambda k: k is not None and not any(re.search(r'(?i)\bdragon\b\W*(has\W+|is\W+|was\W+)?(wins|won|the winner|victorious)|\bhero\b\W*(is\W+|was\W+|has\W+been\W+|has\W+)?(defeated|loses|lost|dies|died|fell|fallen|falls|beaten)(?!\s+(the\s+)?dragon\b)|\bdragon\b\W*(has\W+)?(defeated|defeats|beat|beats|slew|slays)\W+(the\W+)?hero\b', l) for l in L[k:]))(next((i for i, l in enumerate(L) if re.search(r'(?<![\d.])(-\d+|0)(?![\d.])', l)), None))`,
        hint: "The Hero brings the Dragon to 0 HP first here, so don't print that the Dragon won." },
    ],
    // A weaker Hero (20 HP, attack 5) reaches -10 after the Dragon's second attack, with the Dragon at 70. The winner
    // is checked with attack 16 too, where the Hero still loses though its attack is the stronger one, so a winner
    // picked by comparing attacks fails (r3_winner_by_attack).
    probes: [
      { expr: py`(lambda t: (lambda k: k is not None and not nums([65], L=t[k + 1:]) and not nums([-25], L=t[k + 1:]))(next((i for i, l in enumerate(t) if re.search(r'(?<![\d.])(-\d+|0)(?![\d.])', l)), None)))(rerun({'player': "{'name': 'Hero', 'hp': 20, 'attack': 5}"})[0])`,
        hint: "When I made the Hero weaker, the battle kept going after the Hero's HP reached 0: stop as soon as either HP reaches 0." },
      { expr: py`all((lambda t: (lambda k: k is not None and not any(re.search(r'(?i)\bhero\b\W*(has\W+|is\W+|was\W+)?(wins|won|the winner|victorious)|\bdragon\b\W*(is\W+|was\W+|has\W+been\W+|has\W+)?(defeated|loses|lost|dies|died|fell|fallen|falls|beaten)(?!\s+(the\s+)?hero\b)|\bhero\b\W*(has\W+)?(defeated|defeats|beat|beats|slew|slays)\W+(the\W+)?dragon\b', l) for l in t[k:]))(next((i for i, l in enumerate(t) if re.search(r'(?<![\d.])(-\d+|0)(?![\d.])', l)), None)))(rerun({'player': p})[0]) for p in ("{'name': 'Hero', 'hp': 20, 'attack': 5}", "{'name': 'Hero', 'hp': 20, 'attack': 16}"))`,
        hint: "When I made the Hero weaker, your battle still said the Hero won, so print the winner from who really reached 0 HP." },
    ],
  },

  // ---------- Chapter 11 (robotics) ----------
  // Chapters 11-12 and grind_20-23 grade the tasks' own print and dict simulations; there is no pybricks mock.
  ch11_r1: {
    output: [
      { expr: py`all(re.search(p, out) for p in [r'PrimeHub', r'\bZ\b', r'\bY\b', r'\bD\b', r'counterclockwise', r'\bC\b', r'(?<!counter)clockwise', r'62\.4', r'(?<!\d)80(?!\d)'])`,
        hint: "Print every setting: the hub's name and sides, each motor's port and direction, and the wheel diameter and axle track." },
      // A line about only the left motor mustn't show the right motor's port or direction, and the other way
      // round (r1_swapped_print). Lines naming both, such as print(drive_base), aren't checked. A line naming
      // neither ("  Direction: clockwise" under a 'Left motor:' heading) belongs to the last line that named one
      // motor, unless a hub, drive base, wheel or axle line came after that, and is checked when it shows only one
      // motor's port or direction (r2_heading_swapped_dirs).
      { expr: py`not any((re.search(r'(?i)left', l) and not re.search(r'(?i)right', l) and (re.search(r'\bC\b', l) or re.search(r'(?i)(?<!counter)clockwise', l))) or (re.search(r'(?i)right', l) and not re.search(r'(?i)left', l) and (re.search(r'\bD\b', l) or re.search(r'(?i)counterclockwise', l))) for l in L) and (lambda S: not any(S[i] is None and (lambda c, l, isL, isR: (c == 'L' and isL and not isR) or (c == 'R' and isR and not isL))(next((S[j] for j in range(i - 1, -1, -1) if S[j] is not None), None), L[i], bool(re.search(r'\bC\b', L[i]) or re.search(r'(?i)(?<!counter)clockwise', L[i])), bool(re.search(r'\bD\b', L[i]) or re.search(r'(?i)counterclockwise', L[i]))) for i in range(len(L))))([('X' if re.search(r'(?i)left', l) and re.search(r'(?i)right', l) else 'L' if re.search(r'(?i)left', l) else 'R' if re.search(r'(?i)right', l) else 'X' if re.search(r'(?i)hub|drive|base|wheel|axle', l) else None) for l in L])`,
        hint: "Check your labels: the left motor's line should show the left motor's port and direction, and the right motor's line the right one's." },
    ],
    probes: [
      { expr: py`ns.get('hub') == {'name': 'PrimeHub', 'top_side': 'Z', 'front_side': 'Y'} and ns.get('left_motor') == {'port': 'D', 'direction': 'counterclockwise'} and ns.get('right_motor') == {'port': 'C', 'direction': 'clockwise'} and ns.get('drive_base', {}).get('wheel_diameter') == 62.4 and ns['drive_base'].get('axle_track') == 80`,
        hint: "Make the dictionaries exactly as the task shows: hub, left_motor, right_motor and drive_base, with the same keys and values." },
      { expr: py`ns['drive_base'].get('left') is ns['left_motor'] and ns['drive_base'].get('right') is ns['right_motor']`,
        hint: "In drive_base, use the motor variables themselves ('left': left_motor), not a new copy of the dictionary." },
    ],
  },
  ch11_r2: {
    output: [
      // Near misses first: lines that match once capitals and punctuation are ignored, but not as printed, get
      // a hint about the lines' spelling rather than the order of the moves (r1_lowercase). The engine names
      // the line only for lines([...]) checks.
      { expr: py`subseq([r're:Driving 200 ?mm forward', r're:Turning 90 ?(°|deg\w*)? ?right', r're:Driving 150 ?mm forward', r're:Turning -?45 ?(°|deg\w*)? ?left', r're:Driving -?100 ?mm backward']) or not subseq([r're:(?i)driving 200 ?mm forward', r're:(?i)turning 90 ?(°|deg\w*)? ?right', r're:(?i)driving 150 ?mm forward', r're:(?i)turning -?45 ?(°|deg\w*)? ?left', r're:(?i)driving -?100 ?mm backward'], L=[re.sub(r'[^\w\s°-]', '', l).strip() for l in L])`,
        hint: "So close! Check the capital letters and punctuation in your Driving and Turning lines: they should look like 'Driving 200mm forward'." },
      // Lines that start with a drive or a turn and hold a number but aren't written as the task writes them, such
      // as 'Driving forward 200mm', get a hint about the lines' format, not about the moves (r2_word_order). Only
      // when the moves check below fails, so other lines about driving are free.
      { expr: py`subseq([r're:Driving 200 ?mm forward', r're:Turning 90 ?(°|deg\w*)? ?right', r're:Driving 150 ?mm forward', r're:Turning -?45 ?(°|deg\w*)? ?left', r're:Driving -?100 ?mm backward']) or not any((re.match(r'(?i)\W*driv', l) and re.search(r'\d', l) and not re.fullmatch(r'Driving -?\d+ ?mm (forward|backward)', l)) or (re.match(r'(?i)\W*turn', l) and re.search(r'\d', l) and not re.fullmatch(r'Turning -?\d+ ?(°|deg\w*)? ?(right|left)', l)) for l in L)`,
        hint: "Check how your lines are written: they should look like 'Driving 200mm forward' and 'Turning 90° right', with the number before the direction." },
      { expr: py`subseq([r're:Driving 200 ?mm forward', r're:Turning 90 ?(°|deg\w*)? ?right', r're:Driving 150 ?mm forward', r're:Turning -?45 ?(°|deg\w*)? ?left', r're:Driving -?100 ?mm backward'])`,
        hint: "Use your functions for each move in order: 200mm forward, 90° right, 150mm forward, 45° left, 100mm backward." },
      // Anywhere after the last move, not only on the last line: the task says "print it at the end", and the
      // prototype's L[-1] rejected a closing line after it (r2_done_after), as in ch11_r3.
      { expr: py`nums([450], L=L[[i for i, l in enumerate(L) if re.fullmatch(r'Driving -?100 ?mm backward', l)][-1] + 1:])`,
        hint: "After the moves, print total_distance. Count every drive as a positive distance, even backward ones." },
    ],
    // "Track total_distance": it must be updated from something other than typed-in numbers, with += or from a
    // variable or call (total_distance + abs(d), sum(...)). total_distance = 200 + 150 + 100 after the moves
    // passed every check, since the moves are fixed (r1_total_hard).
    concepts: [{ expr: py`any((isinstance(n, ast.AugAssign) and isinstance(n.target, ast.Name) and n.target.id == 'total_distance') or (isinstance(n, ast.Assign) and any(isinstance(t, ast.Name) and t.id == 'total_distance' for t in n.targets) and any(isinstance(m, (ast.Name, ast.Call, ast.Subscript, ast.Attribute)) for m in ast.walk(n.value))) for n in ast.walk(TREE))`,
      hint: "The task asks you to track total_distance: add each drive's distance to it as the robot moves, instead of adding up the numbers yourself." }],
    probes: [
      { expr: py`any(re.fullmatch(r'Driving -?30 ?mm backward', l) for l in callf('robot_straight', -30)[1])`,
        hint: "Make robot_straight(distance) print a line like 'Driving 30mm backward', saying 'backward' when the distance is negative." },
      { expr: py`any(re.fullmatch(r'Turning -?10 ?(°|deg\w*)? ?left', l) for l in callf('robot_turn', -10)[1])`,
        hint: "robot_turn(angle) should print a line like 'Turning 10° left', saying 'left' when the angle is negative." },
      { expr: py`ns.get('total_distance') == 450`, hint: "Keep total_distance up to date: add the size of every drive, using abs() for the backward one." },
    ],
  },
  ch11_r3: {
    output: [
      // The functions themselves first, with capitals and punctuation ignored, so a right_arm that always prints
      // 'at speed 600' or says 'Left arm' hears about that, not about calls it got right (r2_speed_ignored,
      // r2_right_prints_left). Then near misses, and then the calls.
      { expr: py`all(any(re.fullmatch(r'(?i)\W*%s\W+arm\W*%d\W*(deg\w*\W*)?at\W+speed\W*%d\W*' % (w, d, v), l) for l in callf(w + '_arm', d, speed=v)[1]) for w, d, v in (('right', 195, 800), ('left', 40, 100)))`,
        hint: "Make each arm function print its own name with the degrees and the speed it was given, like 'Right arm: 195° at speed 800'." },
      // A negative angle keeps its sign: arm functions printing abs(degrees) were told to call them in the task's
      // order, which they did (r3_abs_degrees).
      { expr: py`all(any(re.fullmatch(r'(?i)\W*%s\W+arm\W*-%d\W*(deg\w*\W*)?at\W+speed\W*%d\W*' % (w, d, v), l) for l in callf(w + '_arm', -d, speed=v)[1]) for w, d, v in (('right', 130, 800), ('left', 70, 100)))`,
        hint: "Print the degrees just as they are given, minus sign and all: right_arm(-240) should show -240." },
      { expr: py`subseq([r're:Right arm: -240 ?(°|deg\w*)? at speed 600', r're:Left arm: 110 ?(°|deg\w*)? at speed 250', r're:Left arm: 40 ?(°|deg\w*)? at speed 100', r're:Right arm: 195 ?(°|deg\w*)? at speed 800']) or not subseq([r're:(?i)\W*right\W+arm\W*-240\W*(deg\w*\W*)?at\W+speed\W*600\W*', r're:(?i)\W*left\W+arm\W*110\W*(deg\w*\W*)?at\W+speed\W*250\W*', r're:(?i)\W*left\W+arm\W*40\W*(deg\w*\W*)?at\W+speed\W*100\W*', r're:(?i)\W*right\W+arm\W*195\W*(deg\w*\W*)?at\W+speed\W*800\W*'])`,
        hint: "So close! Check the capital letters and punctuation in your arm lines: they should look like 'Right arm: -240° at speed 600'." },
      { expr: py`subseq([r're:Right arm: -240 ?(°|deg\w*)? at speed 600', r're:Left arm: 110 ?(°|deg\w*)? at speed 250', r're:Left arm: 40 ?(°|deg\w*)? at speed 100', r're:Right arm: 195 ?(°|deg\w*)? at speed 800'])`,
        hint: "Call the arm functions in the task's order, and give the speed only when it isn't 600." },
      // Anywhere after the last arm move, not only on the last line, which the task never asks for
      // (r1_done_after).
      { expr: py`nums([4], L=L[[i for i, l in enumerate(L) if re.fullmatch(r'Right arm: 195 ?(°|deg\w*)? at speed 800', l)][-1] + 1:])`,
        hint: "After the arm moves, count them and print how many there were." },
    ],
    probes: [
      // The default speed is called on too: the program only leaves it out for right_arm, so left_arm's
      // speed=250 passed (r1_left_default).
      { expr: py`sig('right_arm') == (2, 1) and sig('left_arm') == (2, 1) and numset([600], L=callf('right_arm', 5)[1]) and numset([600], L=callf('left_arm', 5)[1])`,
        hint: "Give both arm functions two parameters, with a default for the speed: (degrees, speed=600)." },
      { expr: py`numset([10, 600], L=callf('right_arm', 10)[1]) and numset([5, 7], L=callf('left_arm', 5, speed=7)[1]) and numset([5, 7], L=callf('right_arm', 5, speed=7)[1])`,
        hint: "Your arm functions should print the degrees and the speed they were given." },
      { expr: py`ns.get('movements') == 4`, hint: "Add 1 to movements for every arm move." },
    ],
  },
  ch11_r4: {
    output: [
      { expr: py`nums_abs([600, 350, 500, 400, 250, 45, 250, 150, 110, 150, 100, 90])`,
        hint: "Run the 4 segments in order (fast 500mm, normal turn 45°, pushing 110mm, slow turn -90°), setting each speed first." },
      // nums_abs ignores signs, so a slow turn of +90 passed (r2_turn_positive). The -90 may also be shown as
      // 'left' on the same line, and the 45 must not be negative.
      { expr: py`bool(re.search(r'-\s*90\b', out) or re.search(r'(?i)\bleft\b.*\b90\b|\b90\b.*\bleft\b', out)) and not re.search(r'(?<!\d)-45\b', out)`,
        hint: "Check the signs of your turns: the normal turn is 45° and the slow turn is -90°." },
    ],
    probes: [
      { expr: py`(ns.get('SPEED_NORMAL'), ns.get('SPEED_FAST'), ns.get('SPEED_SLOW'), ns.get('SPEED_PUSHING')) == ({'straight': 400, 'turn': 250}, {'straight': 600, 'turn': 350}, {'straight': 150, 'turn': 100}, {'straight': 250, 'turn': 150})`,
        hint: "Make the 4 speed profile dictionaries exactly as the task shows." },
      { expr: py`numset([111, 222], L=callf('apply_speed', {'straight': 111, 'turn': 222})[1])`,
        hint: "apply_speed(profile) should print both speeds from the profile it is given." },
      { expr: py`nums([111, 222, 333, 444], L=callf('drive_segment', 333, 444, {'straight': 111, 'turn': 222})[1]) and called_from('apply_speed', 'drive_segment')`,
        hint: "drive_segment should call apply_speed(profile) first, then print the drive and the turn." },
    ],
  },
  ch11_r5: {
    output: [
      // 'Run complete!' after the moves, not on the last line: the task says Run1 calls end_run() last, which a probe
      // checks, not that nothing may follow Run1() (r3_goodbye_after).
      { expr: py`has('Ready!') and any(l.endswith('Run complete!') and nums_abs([690, 45, 130, 90, 90, 240], L=L[:i]) for i, l in enumerate(L))`,
        hint: "Your run should print launch's 'Ready!' first, then the moves (690, 45 right, 130, 90 left, 90, arm -240), and end_run's 'Run complete!' after them." },
      // nums_abs ignores direction, so the left turn done as a right one and the grab at +240 passed
      // (r1_turn_both_right, r1_arm_positive). The turns are read by CH11_TURNS: the right turn after the 690 drive
      // and the left one after the 130 drive. A turn that names no side is left to the next check.
      // The 690 drive, the first line holding 690, mustn't say backward or show -690 (r2_backward_690), and the
      // grab, the first line showing -240, mustn't name the left arm alone (r2_left_arm_grab). The task names no
      // right_arm function here, so the arm is read from the output.
      { expr: py`'direction' not in ${CH11_TURNS}([(690, 45, False), (130, 90, True)]) and bool(re.search(r'-\s*240', out)) and not re.search(r'(?i)back|-\s*690', next((l for l in L if 690 in [abs(int(x)) for x in re.findall(r'-?\d+', l)]), '')) and (lambda g: not re.search(r'(?i)left', g) or bool(re.search(r'(?i)right', g)))(next((l for l in L if re.search(r'-\s*240', l)), ''))`,
        hint: "Check the directions: drive forward 690mm, turn right 45°, turn left 90°, and grab with the right arm at -240°." },
      // A turn naming no side with a word, such as 'Turning -45°', is read by its sign, as turn() takes it: right is
      // positive and left negative, so turns done the other way round fail (m_wt2_turns_swapped). Only angle lines
      // that say they turn (turn, rotate, spin, pivot, ° or deg) are read this way: when a turn shares a line with
      // the drive before it, the line found for it can be the next drive ('Drive 90mm'), which isn't a turn. A
      // turn naming its side with a letter or an arrow alone, 'Turn L 90°', '↩️ Turn 90°' or 'Turn 90° ←', needn't
      // show -90 (turn_letter_rl, turn_hook_emoji, turn_arrow). See CH11_TURNS.
      { expr: py`'sign' not in ${CH11_TURNS}([(690, 45, False), (130, 90, True)])`,
        hint: "Your turn lines show only an angle, so its sign is the direction: a right turn is a positive angle and a left turn a negative one." },
    ],
    probes: [
      { expr: py`'Run1' in trace`, hint: "Call Run1() at the bottom of your program." },
      { expr: py`callees('Run1')[:1] == ['launch'] and callees('Run1')[-1:] == ['end_run']`, hint: "Inside Run1, call launch() first and end_run() last." },
      { expr: py`(lambda t: 'gyro' in t.lower() and 'arm' in t.lower() and 'Ready!' in t)('\n'.join(callf('launch')[1]))`,
        hint: "launch() should print that it resets the gyro and the arms, then 'Ready!'." },
    ],
  },
  ch11_s1: {
    output: [{ expr: py`nums([550, 140, 35, 152]) and len(L) >= 4`, hint: "Print all 4 conversions in mm: 55cm, 14cm, 3.5cm and 6 inches." }],
    probes: [
      { expr: py`val('cm_to_mm(2)') == 20 and val('inches_to_mm(1)') == 25 and val('inches_to_mm(2)') == 51`,
        hint: "cm_to_mm should return cm * 10, and inches_to_mm should return round(inches * 25.4)." },
      // A table typed in beside two unused functions passed (r1_funcs_not_used).
      { expr: py`'cm_to_mm' in trace and 'inches_to_mm' in trace`,
        hint: "Use cm_to_mm and inches_to_mm to work out the conversions, instead of typing the answers in." },
    ],
  },
  ch11_s2: {
    output: [
      // Motor, action and value in any order within each entry's line, so 'left_motor: 400 (straight)' counts
      // (r1_value_before_action); the prototype wanted motor, then action, then value.
      { expr: py`subseq([r're:(?=.*left_motor)(?=.*straight)(?=.*(?<![\d-])400(?!\d)).*', r're:(?=.*right_motor)(?=.*straight)(?=.*(?<![\d-])400(?!\d)).*', r're:(?=.*left_arm)(?=.*rotate)(?=.*-240(?!\d)).*', r're:(?=.*right_arm)(?=.*rotate)(?=.*(?<![\d-])195(?!\d)).*'])`,
        hint: "Print each log entry in order, showing its motor, action and value." },
      // The total may be on any line that isn't an entry, not only the last one (r1_done_after).
      { expr: py`nums([4], L=[l for l in L if not any(re.fullmatch(p, l) for p in (r'(?=.*left_motor)(?=.*straight)(?=.*(?<![\d-])400(?!\d)).*', r'(?=.*right_motor)(?=.*straight)(?=.*(?<![\d-])400(?!\d)).*', r'(?=.*left_arm)(?=.*rotate)(?=.*-240(?!\d)).*', r'(?=.*right_arm)(?=.*rotate)(?=.*(?<![\d-])195(?!\d)).*'))])`,
        hint: "Print the total number of commands too." },
    ],
    probes: [
      // Split in three, so arguments passed in the wrong order, or values logged as text ("400"), hear about that
      // rather than about logging 4 dictionaries, which they did (r2_args_swapped, r2_value_strings).
      { expr: py`isinstance(ns.get('log'), list) and len(ns['log']) == 4 and all(isinstance(e, dict) for e in ns['log'])`,
        hint: "Log the 4 commands with log_command, so log ends up holding 4 dictionaries." },
      { expr: py`[(e.get('motor'), e.get('action')) for e in ns['log']] == [('left_motor', 'straight'), ('right_motor', 'straight'), ('left_arm', 'rotate'), ('right_arm', 'rotate')]`,
        hint: "Give log_command its arguments in the task's order, log_command(log, motor, action, value), so each dictionary gets the right motor and action." },
      { expr: py`[e.get('value') for e in ns['log']] == [400, 400, -240, 195] and all(type(e.get('value')) is int for e in ns['log'])`,
        hint: "Log each value as a number, like 400 or -240, not as text in quotes." },
      { expr: py`(lambda l: (callf('log_command', l, 'm', 'a', 1), l == [{'motor': 'm', 'action': 'a', 'value': 1}])[1])([])`,
        hint: "log_command should append one dictionary to the log list it is given. Don't make a new list inside it." },
    ],
  },
  ch11_s3: {
    output: [
      // Left turns passed as positive angles make the third heading 225, not 135: that mistake gets its own hint
      // (r1_left_positive), which the heading hints below don't give.
      { expr: py`not (nums([90, 180, 225]) and not nums([90, 180, 135]))`,
        hint: "A left turn goes the other way from a right turn, so turn left with a negative angle." },
      // The final heading is the last number printed, not the last line: a line without numbers may follow
      // (r1_facing_after). Or it is a second 45 after the fifth heading, so a line with another number may follow
      // too ('That was 5 turns!', r3_turn_count_after).
      { expr: py`nums([90, 180, 135, 315, 45]) and (nums([45], L=[l for l in L if re.search(r'\d', l)][-1:]) or nums([90, 180, 135, 315, 45, 45]))`,
        hint: "Print the heading after each of the 5 turns, then the final heading." },
    ],
    // heading %= 360 is % 360 too: binop only counts a % b (m_cu1_named_dirs).
    concepts: [{ expr: py`binop('Mod') + sum(isinstance(n, ast.AugAssign) and isinstance(n.op, ast.Mod) for n in ast.walk(TREE)) >= 1`,
      hint: "The task asks you to wrap the heading into 0-359 with % 360." }],
    probes: [
      { expr: py`val('turn(350, 20)') == 10 and val('turn(10, -30)') == 340 and val('turn(0, 720)') == 0`,
        hint: "turn(heading, angle) should always return a heading from 0 to 359, even when the sum goes past 360 or below 0." },
      { expr: py`ns.get('heading') == 45`, hint: "Your heading variable should end at 45: save turn()'s answer back into it after every turn, and turn left with a negative angle." },
    ],
  },
  ch11_boss: {
    // Unlike ch11_r5, this task leaves launch() and end_run()'s messages up to the kid, so the prototype's
    // 'Ready!' / 'Run complete!' became the kid's own launch output and end_run output last (ALT_own_messages).
    output: [
      { expr: py`nums_abs([ns['SPEED_FAST']['straight'], 690, 45, 130, 90, 90, 240, ns['SPEED_NORMAL']['straight'], 350])`,
        hint: "Run1 should set fast speed, drive 690, turn 45, drive 130, turn 90, drive 90, grab at -240, set normal speed and back up 350, in that order." },
      // end_run's lines after all the moves rather than on the last lines, which the task never asks for, so a
      // goodbye after Run1() is fine (r3_goodbye_after); an end_run before the backup drive still fails.
      { expr: py`(lambda a, b: len(a) > 0 and len(b) > 0 and subseq(a) and any(L[i:i + len(b)] == b and nums_abs([ns['SPEED_FAST']['straight'], 690, 45, 130, 90, 90, 240, ns['SPEED_NORMAL']['straight'], 350], L=L[:i]) for i in range(len(L))))(callf('launch')[1], callf('end_run')[1])`,
        hint: "Start the run with launch() and finish it with end_run(), and make both print a status message." },
      // As in ch11_r5, with the backward drive: its line is the first holding 350 after the grab's 240
      // (r1_turn_right_twice, r1_backward_forward).
      // As in ch11_r5, the 690 drive mustn't be backward (r2_first_drive_backward), and the grab, the first line
      // showing -240, mustn't name the left arm alone (r2_left_arm_and_right).
      { expr: py`'direction' not in ${CH11_TURNS}([(690, 45, False), (130, 90, True)]) and (lambda F: not re.search(r'(?i)forward', F(240, 350)) or re.search(r'(?i)back|-\s*350', F(240, 350)))(lambda a, b: next((l for l in L[next((i for i, l in enumerate(L) if a in [abs(int(x)) for x in re.findall(r'-?\d+', l)]), len(L)) + 1:] if b in [abs(int(x)) for x in re.findall(r'-?\d+', l)]), '')) and bool(re.search(r'-\s*240', out)) and not re.search(r'(?i)back|-\s*690', next((l for l in L if 690 in [abs(int(x)) for x in re.findall(r'-?\d+', l)]), '')) and (lambda g: not re.search(r'(?i)left', g) or bool(re.search(r'(?i)right', g)))(next((l for l in L if re.search(r'-\s*240', l)), ''))`,
        hint: "Check the directions: drive forward 690mm, turn right 45°, turn left 90°, grab with the right arm at -240°, and drive backward 350mm at the end." },
      // As in ch11_r5: a turn naming no side with a word is read by its sign (m_d_turns_swapped), and one naming it
      // with a letter or an arrow alone needn't show -90 (turn_letter_rl, turn_hook_emoji, turn_arrow).
      { expr: py`'sign' not in ${CH11_TURNS}([(690, 45, False), (130, 90, True)])`,
        hint: "Your turn lines show only an angle, so its sign is the direction: a right turn is a positive angle and a left turn a negative one." },
    ],
    probes: [
      { expr: py`all({'straight', 'turn'} <= set(ns.get(k, {})) for k in ('SPEED_FAST', 'SPEED_NORMAL'))`,
        hint: "SPEED_FAST and SPEED_NORMAL should be dictionaries with 'straight' and 'turn' keys." },
      { expr: py`sig('right_arm') == (2, 1) and sig('left_arm') == (2, 1) and numset([600], L=callf('left_arm', 5)[1])`,
        hint: "Give right_arm and left_arm a speed parameter that defaults to 600, and print the speed." },
      // "prints the speeds being set": both of them, as in ch11_r4, so an apply_speed printing only the straight
      // speed fails (r3_apply_straight_only).
      { expr: py`numset([111, 222], L=callf('apply_speed', {'straight': 111, 'turn': 222})[1])`,
        hint: "apply_speed(profile) should print both speeds it sets, the straight one and the turn one." },
      { expr: py`callees('Run1')[:1] == ['launch'] and callees('Run1')[-1:] == ['end_run'] and callees('Run1').count('apply_speed') >= 2 and 'right_arm' in callees('Run1')`,
        hint: "Run1 should call launch() first, apply_speed twice (fast, then normal), right_arm to grab, and end_run() last." },
    ],
  },

  // ---------- Chapter 12 (robotics, simulated sensor data) ----------
  ch12_r1: {
    // Lower-cased, unlike the prototype, which compared the words as printed, so 'BLACK' failed (ALT_capitals).
    // The 8 words in order, with other black/white words allowed around them: the prototype took the last 8, so
    // a legend after the readings ("black means on the line") shifted them (r1_legend_after).
    // On/off words count as well as black/white, as the task's own "left on line, right off" does, and 'not on'
    // (or "isn't on") reads as off: 'Right sensor (60): not on the line' read as on before (r2_not_on_line).
    output: [{ expr: py`(lambda it: all(w in it for w in ['black', 'white', 'white', 'black', 'black', 'black', 'white', 'white']))(iter([w.lower() for w in re.findall(r'(?i)\b(black|white)\b', out)])) or (lambda it: all(w in it for w in ['on', 'off', 'off', 'on', 'on', 'on', 'off', 'off']))(iter([('on' if w.lower() == 'on' else 'off') for w in re.findall(r"(?i)\b(?:not|isn[’']?t)\s+on\b|\boff\b|\bon\b", out)]))`,
      hint: "For each of the 4 readings, print the status of both sensors, left first: black or white, or on or off the line." }],
    probes: [
      { expr: py`[val('read_sensor(%d)' % v) for v in (0, 21, 22, 90)] == ['black', 'black', 'white', 'white']`,
        hint: "Make read_sensor(value) return 'black' when the value is below BLACK_LINE, and 'white' otherwise (so exactly 22 is 'white')." },
      { expr: py`ns.get('BLACK_LINE') == 22 and trace.count('check_sensors') == 4`,
        hint: "Keep BLACK_LINE = 22, and call check_sensors once for each of the 4 readings." },
      // Calls check_sensors directly: the prototype re-ran with a new readings list, which rejected calling
      // check_sensors with the 4 readings typed in, as the task lists them (ALT_direct_calls).
      { expr: py`(lambda t: [w.lower() for w in re.findall(r'(?i)\b(black|white)\b', t)][-2:] == ['white', 'black'] or [('on' if w.lower() == 'on' else 'off') for w in re.findall(r"(?i)\b(?:not|isn[’']?t)\s+on\b|\boff\b|\bon\b", t)][-2:] == ['off', 'on'])('\n'.join(callf('check_sensors', 30, 5)[1]))`,
        hint: "check_sensors(left_val, right_val) should use read_sensor to print both sensors, left first." },
    ],
  },
  ch12_r2: {
    output: [
      { expr: py`subseq([r're:(?i).*driving.*\b80\b.*', r're:(?i).*driving.*\b75\b.*', r're:(?i).*driving.*\b60\b.*', r're:(?i).*driving.*\b55\b.*', r're:(?i).*driving.*\b40\b.*', r're:(?i).*line detected.*\b18\b.*'])`,
        hint: "Print a 'Driving...' line for each white reading, then 'LINE DETECTED!' with the first black reading." },
      // "Driving... (white)" is for the white readings only: printed before the check, it showed the black 18 as
      // white too (r3_prints_before_check).
      { expr: py`not any(re.search(r'(?i)driving.*\b18\b.*white', l) for l in L)`,
        hint: "Print 'Driving...' only for white readings: check for black first, so the black reading gets only the LINE DETECTED line." },
      { expr: py`not re.search(r'sensor: 10\b', out)`, hint: "Stop as soon as you find the line: the reading after it should never be printed." },
      // Anywhere after the LINE DETECTED line, not only on the last line, which the task never asks for
      // (r1_stopped_after).
      { expr: py`(lambda t: nums([6], L=t) or nums([5], L=t))(L[[i for i, l in enumerate(L) if re.search(r'(?i)line detected', l)][-1] + 1:])`,
        hint: "After the line is found, print how many ticks drive_until_line returned." },
    ],
    probes: [
      { expr: py`(lambda a, b: (a[0], b[0]) in [(2, 1), (1, 0)] and not any(re.search(r'\b5\b', l) for l in a[1]))(callf('drive_until_line', [50, 10, 5], 22), callf('drive_until_line', [10], 22))`,
        hint: "drive_until_line should stop at the first reading below the threshold and return how many ticks it drove." },
      // A reading exactly on the threshold is white, as in ch12_r1 and ch12_r3: stopping on val <= threshold passed
      // the calls above (r2_le_threshold). The counts go with the ones above: 3 with the stopping tick, 2 without.
      { expr: py`(lambda a, b: (a[0], b[0]) in [(3, 2), (2, 1)] and any(re.search(r'\b10\b', l) for l in a[1]))(callf('drive_until_line', [50, 22, 10], 22), callf('drive_until_line', [50, 10, 5], 22))`,
        hint: "A reading of exactly the threshold is still white, so drive_until_line should only stop at a reading below it." },
    ],
  },
  ch12_r3: {
    output: [
      // First, so an analyze_alignment with the two turns swapped hears about that, not about print_action, which
      // it used right (r2_turns_swapped).
      { expr: py`[val('analyze_alignment(%d, %d)' % p) for p in [(15, 60), (55, 18)]] != ['turn_left', 'turn_right']`,
        hint: "When only the left sensor sees the line, analyze_alignment should return 'turn_right', and 'turn_left' when only the right one does." },
      { expr: py`subseq(sum([callf('print_action', a)[1] for a in ['aligned', 'turn_right', 'turn_left', 'drive_forward', 'aligned', 'drive_forward']], []))`,
        hint: "Use print_action to show the action for each of the 6 readings, in order." },
      // Anywhere after the last action, not only on the last line (r1_done_after).
      { expr: py`(lambda a: len(a) > 0 and nums([2], L=L[[i for i, l in enumerate(L) if l == a[-1]][-1] + 1:]))(callf('print_action', 'drive_forward')[1])`,
        hint: "After the actions, count the 'aligned' readings and print the count." },
    ],
    probes: [
      // Split from the turns, so turns the wrong way round aren't told about 'aligned' (r2_turns_swapped).
      { expr: py`(lambda r: r[0] == 'aligned' and r[3] == 'drive_forward' and r[4] == 'drive_forward' and r[5] == 'aligned' and r[1] in ('turn_right', 'turn_left') and r[2] in ('turn_right', 'turn_left'))([val('analyze_alignment(%d, %d)' % p) for p in [(10, 12), (15, 60), (55, 18), (70, 80), (22, 22), (21, 21)]])`,
        hint: "analyze_alignment should return 'aligned' only when both values are below BLACK_LINE. A reading of exactly 22 is not on the line." },
      { expr: py`[val('analyze_alignment(%d, %d)' % p) for p in [(15, 60), (55, 18), (10, 22), (22, 10)]] == ['turn_right', 'turn_left', 'turn_right', 'turn_left']`,
        hint: "A reading of exactly 22 is not on the line, so analyze_alignment(10, 22) should say 'turn_right' and analyze_alignment(22, 10) 'turn_left'." },
      { expr: py`len({tuple(callf('print_action', a)[1]) for a in ['aligned', 'turn_right', 'turn_left', 'drive_forward']}) == 4`,
        hint: "print_action should print a different message for each of the 4 actions." },
      // With 3 aligned readings instead of 2, so a count typed in, or one of another action, fails (r2_count_typed,
      // r2_count_forward): the task's data has 2 of each.
      { expr: py`(lambda t, a: len(a) > 0 and nums([3], L=t[[i for i, l in enumerate(t) if l == a[-1]][-1] + 1:]))(rerun({'readings': '[(10, 12), (5, 5), (1, 1), (60, 70)]'})[0], callf('print_action', 'drive_forward')[1])`,
        hint: "Count the 'aligned' readings as your loop runs, so the count changes when the readings do." },
    ],
  },
  // Phase 1 may print 'Driving...' before or after checking each reading, so the task's data gives 3 or 4 Driving
  // lines (r2_driving_each_then_stop, round 1's ok_print_then_check), and headings such as 'Phase 1: driving until
  // one sensor sees the line' or 'Phase 2: wiggling until aligned' may add words the checks read (r2_phase1_heading_only,
  // r2_phase2_heading_only, r2_phase_headings). So each run is compared with a baseline run in which the phase stops
  // at its only reading, (10, 10): the Driving lines must number 3 more than there (1 more in the probes), and the
  // actions must be the baseline's with its 'aligned' replaced by the expected actions. Headings and tick lines
  // print the same in both, and so drop out.
  ch12_r4: {
    output: [
      { expr: py`(lambda D: D(L) - D(rerun({'approach': '[(10, 10)]'})[0]) == 3)(lambda t: len([l for l in t if 'driving' in l.lower()]))`, hint: "In phase 1, print 'Driving...' for each reading until one sensor sees the line." },
      { expr: py`(lambda A: (lambda a, b: any(b[p] == 'aligned' and a == b[:p] + ['turn_right'] * 3 + ['aligned'] + b[p + 1:] for p in range(len(b))))(A(L), A(rerun({'alignment': '[(10, 10)]'})[0])))(lambda t: [w.lower().replace(' ', '_') for w in re.findall(r'(?i)turn[ _]right|turn[ _]left|aligned|drive[ _]forward', '\n'.join(t))])`,
        hint: "In phase 2, print the action for each reading (turn_right, turn_left or aligned) until both sensors see the line." },
      // Either phase may count its stopping tick or not: the prototype allowed only (4, 4) or (3, 4), which
      // rejected counting only the ticks before each stop, (3, 3) (ALT_count_before).
      // The ticks are read from all the lines after 'Squared on line!', not the last 2, so a 'Total ticks: 8'
      // after them is fine (r1_total_ticks). Phase labels ("Phase 1", "P2") are taken out first, so their
      // numbers aren't read as tick counts.
      { expr: py`has('Squared on line!') and (lambda t: any(nums([a, b], L=t) for a in (3, 4) for b in (3, 4)))([re.sub(r'(?i)\b(phase|p)\s*[12]\b', '', l) for l in L[[i for i, l in enumerate(L) if 'Squared on line!' in l][-1] + 1:]])`,
        hint: "Print '✅ Squared on line!' when both sensors are on the line, then the ticks for phase 1 and phase 2." },
    ],
    // A reading after each stopping point, unlike the prototype's data, where the lists end where the phases
    // stop, so loops that never stop passed (no_break).
    probes: [
      { expr: py`(lambda D, A, t: D(t) - D(rerun({'approach': '[(10, 10)]', 'alignment': '[(10, 90), (5, 5), (90, 10)]'})[0]) == 1 and (lambda a, b: any(b[p] == 'aligned' and a == b[:p] + ['turn_right', 'aligned'] + b[p + 1:] for p in range(len(b))))(A(t), A(rerun({'approach': '[(80, 80), (10, 90), (80, 80)]', 'alignment': '[(10, 10)]'})[0])))(lambda t: len([l for l in t if 'driving' in l.lower()]), lambda t: [w.lower().replace(' ', '_') for w in re.findall(r'(?i)turn[ _]right|turn[ _]left|aligned|drive[ _]forward', '\n'.join(t))], rerun({'approach': '[(80, 80), (10, 90), (80, 80)]', 'alignment': '[(10, 90), (5, 5), (90, 10)]'})[0])`,
        hint: "Your loops should work with other sensor data too: stop phase 1 when either sensor is below 22, and stop phase 2 when both are." },
      // The same with only the right sensor on the line: stopping phase 1 on the left sensor alone passed the
      // task's data and the probe above, which both hit on the left (r1_left_only).
      { expr: py`(lambda D, A, t: D(t) - D(rerun({'approach': '[(10, 10)]', 'alignment': '[(90, 10), (5, 5), (10, 90)]'})[0]) == 1 and (lambda a, b: any(b[p] == 'aligned' and a == b[:p] + ['turn_left', 'aligned'] + b[p + 1:] for p in range(len(b))))(A(t), A(rerun({'approach': '[(80, 80), (90, 10), (80, 80)]', 'alignment': '[(10, 10)]'})[0])))(lambda t: len([l for l in t if 'driving' in l.lower()]), lambda t: [w.lower().replace(' ', '_') for w in re.findall(r'(?i)turn[ _]right|turn[ _]left|aligned|drive[ _]forward', '\n'.join(t))], rerun({'approach': '[(80, 80), (90, 10), (80, 80)]', 'alignment': '[(90, 10), (5, 5), (10, 90)]'})[0])`,
        hint: "Phase 1 should stop when either sensor sees the line, the right one as well as the left one." },
      // With the first probe's data each phase stops at its 2nd reading, so the ticks are 1 or 2 each: tick
      // lines typed in as 'Phase 1 ticks: 4' passed before (r1_ticks_hard).
      { expr: py`(lambda t: any(nums([a, b], L=[re.sub(r'(?i)\b(phase|p)\s*[12]\b', '', l) for l in t[[i for i, l in enumerate(t) if 'Squared on line!' in l][-1] + 1:]]) for a in (1, 2) for b in (1, 2)))(rerun({'approach': '[(80, 80), (10, 90), (80, 80)]', 'alignment': '[(10, 90), (5, 5), (90, 10)]'})[0])`,
        hint: "Count the ticks in each phase as your loops run, so the counts change when the sensor data does." },
      // A reading of exactly 22 is white in both phases, as the task's "< 22" says: with <= BLACK_LINE, phase 1
      // stopped at (22, 80) and phase 2 took (10, 22) as aligned, and no reading in the tests above is 22 (r3_le_22).
      // Phase 1 must print 2 more Driving lines than the baseline, and phase 2 must turn right before aligning.
      { expr: py`(lambda D, A: D(rerun({'approach': '[(80, 80), (22, 80), (10, 90), (80, 80)]', 'alignment': '[(10, 10)]'})[0]) - D(rerun({'approach': '[(10, 10)]', 'alignment': '[(10, 10)]'})[0]) == 2 and (lambda a, b: any(b[p] == 'aligned' and a == b[:p] + ['turn_right', 'aligned'] + b[p + 1:] for p in range(len(b))))(A(rerun({'approach': '[(10, 10)]', 'alignment': '[(10, 22), (5, 5), (90, 10)]'})[0]), A(rerun({'approach': '[(10, 10)]', 'alignment': '[(10, 10)]'})[0])))(lambda t: len([l for l in t if 'driving' in l.lower()]), lambda t: [w.lower().replace(' ', '_') for w in re.findall(r'(?i)turn[ _]right|turn[ _]left|aligned|drive[ _]forward', '\n'.join(t))])`,
        hint: "A reading of exactly 22 is still white: only a reading below 22 means a sensor is on the line, in both phases." },
      // 'Squared on line!' comes after phase 2's turns: in the first run, and in a rerun that turns right, then
      // left, then lines up, the first 'Squared on line!' line must come after those turns, and the rerun mustn't
      // stop with an error. So one printed before phase 2, or after each reading, fails (squared_before_phase2,
      // squared_every_reading), and one printed just before 'aligned' is fine (squared_then_aligned). An earlier
      // probe used data that never lines up and wanted no 'Squared on line!', but the task's data always does, so
      // a 'Squared on line!' printed after the loop is fine (r2_squared_always, m_ct1_for_break), and a while loop
      // that read past the end of that data stopped with an error, printed nothing, and so passed (m_ct2_while_hint).
      { expr: py`(lambda A: (lambda P: P(L, ['turn_right'] * 3) and (lambda t, r: r.error is None and P(t, ['turn_right', 'turn_left']))(*rerun({'alignment': '[(10, 90), (90, 10), (5, 5), (90, 10)]'})))(lambda t, w: (lambda k: k is not None and (lambda it: all(x in it for x in w))(iter(A(t[:k]))))(next((i for i, l in enumerate(t) if 'Squared on line' in l), None))))(lambda t: [w.lower().replace(' ', '_') for w in re.findall(r'(?i)turn[ _]right|turn[ _]left|aligned|drive[ _]forward', '\n'.join(t))])`,
        hint: "Print '✅ Squared on line!' after phase 2's turns, once both sensors are on the line." },
    ],
  },
  // The menu may also be shown once before the first press, as a real menu would ('=== Program 1 ===' first):
  // the task asks for it after each press and doesn't rule that out (r1_initial_menu). Only the menu's own lines are
  // read, the ones that are a menu, launching or complete line once capitals and punctuation are ignored, so blank
  // lines for spacing and a line naming the button pressed are fine (r3_blank_plain, r3_blank_between_mod,
  // r3_pressed_label). That makes the checks "lines(...) or lines(...)" on those lines, which the engine can't name
  // a differing line for, so near misses get their own check: lines that match once capitals, spaces and
  // punctuation are ignored, but not as printed.
  ch12_r5: {
    output: [
      { expr: py`(lambda P, lo, T: lines(P, L=T) or lines(['=== Program 1 ==='] + P, L=T) or not (lines([lo(p) for p in P], L=[lo(l) for l in T]) or lines([lo('=== Program 1 ===')] + [lo(p) for p in P], L=[lo(l) for l in T])))(['=== Program 2 ===', '=== Program 3 ===', r're:.*Launching Run 3\.\.\.', r're:.*Run 3 complete!', '=== Program 4 ===', r're:.*Launching Run 4\.\.\.', r're:.*Run 4 complete!', '=== Program 1 ===', '=== Program 4 ===', r're:.*Launching Run 4\.\.\.', r're:.*Run 4 complete!', '=== Program 1 ===', r're:.*Launching Run 1\.\.\.', r're:.*Run 1 complete!', '=== Program 2 ==='], lambda x: ('re:.*' + ' '.join(re.sub(r'[^\w\s]', ' ', x[3:].replace(r'\.', '.')).lower().split())) if x.startswith('re:') else ' '.join(re.sub(r'[^\w\s]', ' ', x).lower().split()), (lambda t: [l for l in t if re.fullmatch(r'program \d+|.*launching run \d+|.*run \d+ complete', ' '.join(re.sub(r'[^\w\s]', ' ', l).lower().split()))])(L))`,
        hint: "So close! Check the capital letters, spaces and punctuation in your lines: they should look like '=== Program 2 ===' and '🚀 Launching Run 3...'." },
      // run_program's own two lines, so one that prints them on one line hears about that, not about the menu
      // logic it got right (r2_one_line_run).
      { expr: py`not callable(ns.get('run_program')) or (lambda t: len(t) >= 2 and bool(re.fullmatch(r'.*Launching Run 7\.\.\.', t[0])) and bool(re.fullmatch(r'.*Run 7 complete!', t[1])))(callf('run_program', 7)[1])`,
        hint: "run_program(num) should print two lines: '🚀 Launching Run [num]...' and then '✅ Run [num] complete!'." },
      { expr: py`(lambda P, T: lines(P, L=T) or lines(['=== Program 1 ==='] + P, L=T))(['=== Program 2 ===', '=== Program 3 ===', r're:.*Launching Run 3\.\.\.', r're:.*Run 3 complete!', '=== Program 4 ===', r're:.*Launching Run 4\.\.\.', r're:.*Run 4 complete!', '=== Program 1 ===', '=== Program 4 ===', r're:.*Launching Run 4\.\.\.', r're:.*Run 4 complete!', '=== Program 1 ===', r're:.*Launching Run 1\.\.\.', r're:.*Run 1 complete!', '=== Program 2 ==='], (lambda t: [l for l in t if re.fullmatch(r'program \d+|.*launching run \d+|.*run \d+ complete', ' '.join(re.sub(r'[^\w\s]', ' ', l).lower().split()))])(L))`,
        hint: "Show the menu after every button press. 'center' runs the program and then moves to the next one, and 4 wraps back to 1." },
    ],
    // The functions first, so their hint isn't hidden behind the buttons probe's (r2_one_line_run).
    probes: [
      { expr: py`callf('show_menu', 7)[1] == ['=== Program 7 ==='] and len(callf('run_program', 2)[1]) == 2`,
        hint: "show_menu(num) should print '=== Program num ===', and run_program(num) should print the launching line and the complete line." },
      { expr: py`(lambda P, t: lines(P, L=t) or lines(['=== Program 1 ==='] + P, L=t))(['=== Program 4 ===', r're:.*Launching Run 4\.\.\.', r're:.*Run 4 complete!', '=== Program 1 ==='], (lambda t: [l for l in t if re.fullmatch(r'program \d+|.*launching run \d+|.*run \d+ complete', ' '.join(re.sub(r'[^\w\s]', ' ', l).lower().split()))])(rerun({'buttons': "['left', 'center']"})[0]))`,
        hint: "Your menu should work for other button presses too: 'left' from program 1 wraps around to 4." },
    ],
  },
  // A list printed whole, such as a 'Target 90°, readings: [0, 15, ..., 95]' heading, is left out, so its 95 isn't
  // read as a reading printed after the stop (r3_readings_header), and printing only the list doesn't count as
  // printing each reading (r2_print_list).
  ch12_s1: {
    output: [
      { expr: py`nums([0, 15, 32, 48, 65, 78, 91, 0, -10, -22, -38, -46], L=[re.sub(r'\[[^\]]*\]', '', l) for l in L])`, hint: "Print each gyro reading until the turn reaches its target, for both turns." },
      { expr: py`(lambda T: not re.search(r'(?<![-\d])95\b', T) and not re.search(r'-50\b', T))('\n'.join(re.sub(r'\[[^\]]*\]', '', l) for l in L))`,
        hint: "Stop as soon as a reading reaches or passes the target, so the readings after it are never printed." },
    ],
    probes: [
      { expr: py`callf('gyro_turn', 90, [0, 15, 32, 48, 65, 78, 91, 95])[0] == 91 and callf('gyro_turn', -45, [0, -10, -22, -38, -46, -50])[0] == -46`,
        hint: "gyro_turn should return the reading where it stopped, for positive and for negative targets." },
      { expr: py`(lambda r: r[0] == 40 and not any(re.search(r'\b50\b', re.sub(r'\[[^\]]*\]', '', l)) for l in r[1]))(callf('gyro_turn', 30, [0, 10, 40, 50]))`,
        hint: "gyro_turn should stop at the first reading that reaches the target, for any target and any readings." },
      // A reading exactly on the target, for both signs: stopping only once a reading passes it (> and <)
      // went on to 50 (r1_strict).
      { expr: py`(lambda a, b: a[0] == 40 and not any(re.search(r'\b50\b', re.sub(r'\[[^\]]*\]', '', l)) for l in a[1]) and b[0] == -40 and not any(re.search(r'-50\b', re.sub(r'\[[^\]]*\]', '', l)) for l in b[1]))(callf('gyro_turn', 40, [0, 10, 40, 50]), callf('gyro_turn', -40, [0, -10, -40, -50]))`,
        hint: "A reading equal to the target counts as reaching it, so gyro_turn should stop there too." },
      // "Print each reading", the one that reaches the target too: checked before printing, it was only printed by the
      // caller, as the returned final angle, which the output check can't tell apart (r3_check_before_print).
      { expr: py`any(re.search(r'(?<![-\d])40\b', re.sub(r'\[[^\]]*\]', '', l)) for l in callf('gyro_turn', 30, [0, 10, 40, 50])[1])`,
        hint: "gyro_turn should print every reading it gets to, including the one that reaches the target, and then stop." },
    ],
  },
  ch12_s2: {
    output: [{ expr: py`(has('2:16') or has('136')) and (has('0:14') or bool(re.search(r'\b14\b', out)))`,
      hint: "At the end, print the total time used and the time remaining." }],
    probes: [
      // 100 and 45 too: seconds / 60 rounded gave the right minutes for the first four, since 2.5 rounds to 2
      // (r2_minutes_float), but not '1:40' or '0:45'.
      { expr: py`[val('format_time(%d)' % s) for s in (150, 65, 5, 0, 100, 45)] == ['2:30', '1:05', '0:05', '0:00', '1:40', '0:45']`,
        hint: "format_time(seconds) should return the whole minutes and 2-digit seconds, like '1:40' for 100 seconds or '1:05' for 65." },
      // (30, 28, buffer=0) fits only if the buffer given is used: a can_fit_run that always adds 5 passed the
      // (33, 28, buffer=0) call, where 5 and 0 give the same answer (r2_buffer_ignored).
      { expr: py`val('can_fit_run(100, 28)') is True and val('can_fit_run(30, 28)') is False and val('can_fit_run(33, 28, buffer=0)') is True and val('can_fit_run(30, 28, buffer=0)') is True`,
        hint: "can_fit_run should return True only when the run plus the buffer (5 seconds unless you give another) fits in time_left." },
      // An exact fit fits: time_left > run_time + buffer passed the three calls above (r1_strict_gt).
      { expr: py`val('can_fit_run(33, 28)') is True`,
        hint: "A run whose time plus the 5-second buffer uses up exactly the time left still fits, so can_fit_run(33, 28) should be True." },
      // polarity() plus more "doesn't fit" words: polarity's \bn't\b can't match inside a word, so it missed
      // "doesn't" and "can't" (ALT_doesnt_fit), and polarity keeps "fits: False" (ALT_bool_status). From the
      // first "doesn't fit" line on (run 2 is the last run, so the summary follows), the output must show
      // 0:50 left and 1:40 used. A bare 50 counts only when no digit, '.' or '-' comes right before it, and a
      // ':' right before it only rules it out when a digit comes before that ':': the prototype's "50 anywhere"
      // was met by the "-1:50" that format_time(-10) gives after taking away a run that didn't fit
      // (subtract_anyway, split_totals), but raw seconds after a bare colon, "Time left:50", are right
      // (ALT_raw_seconds). The 1:40 check can't stand in for the 50 check, since a "not"
      // on an earlier line starts the window at run 1's "1:40" (header_neg_word). Reading from that line rather
      // than the last 2 lines lets extra summary lines such as "Runs skipped: 1" pass (ALT_run_counts). A ❌ or
      // ✗ status mark counts as "doesn't fit" as well (r1_emoji_status), and so do "too much", "out of time",
      // "overtime" and "exceeds" (r2_too_much_time, r2_out_of_time).
      { expr: py`(lambda t: (lambda k: k is not None and (has('0:50', L=t[k:]) or bool(re.search(r'(?<![\d.-])(?<!\d:)50(?!\d)', '\n'.join(t[k:])))) and (has('1:40', L=t[k:]) or has('100', L=t[k:])))(next((i for i, l in enumerate(t) if polarity(l) == -1 or re.search(r"(?i)\b(cannot|can[’']t|won[’']t|doesn[’']t|isn[’']t|skip\w*|exceed\w*)\b|too long|too much|out of time|over ?time|❌|✗|✘|✖|🚫|⛔", l)), None)))(rerun({'run_times': '[100, 60]'})[0])`,
        hint: "When a run doesn't fit, print that it doesn't fit, and don't take its time away." },
    ],
  },
  ch12_s3: {
    output: [
      // Within 0.5, so values rounded to whole numbers count: the task sets no precision, and a threshold printed
      // as round(threshold) = 46 was rejected (r1_round_int).
      { expr: py`nums_approx([80, 12.4, 46.2], tol=0.5)`, hint: "Print the white average, the black average and the threshold halfway between them." },
      // Each reading on a line with its colour, the colour after it for every reading or before it for every one: the
      // task sets no format. The prototype wanted the reading first, which rejected 'black: 20' (r2_color_first), and
      // each reading on a line of its own, which rejected a list of pairs (m_cu1_avgs_passed) and readings grouped by
      // colour (grouped_by_colour). See CH12_S3_COLOURS: a reading shown with both colours fails (both_groups,
      // all_white_group).
      { expr: py`${CH12_S3_COLOURS}(L, [(20, 'black'), (45, 'black'), (8, 'black'), (60, 'white')])`,
        hint: "Test each reading against your threshold and print whether it is black or white." },
    ],
    probes: [
      // average([1, 2]) is 1.5, so // passed the whole-number means before (r2_floor_div); rounding only when
      // printing is still fine (r1_round_int). With 3 white samples and 1 black one, the midpoint of the averages
      // (5) isn't the mean of all 4 samples (7.5), which the task's 5 and 5 samples give alike (r2_all_mean).
      // calibrate(white, black) may take the two averages instead of the sample lists, as 'midpoint between
      // averages' allows (m_cu1_avgs_passed): then calibrate(10, 5) is 7.5, which // gets wrong, and
      // calibrate(80, 20) is 50, which half the difference (30) gets wrong.
      { expr: py`val('average([1, 2, 3])') == 2 and val('average([1, 2])') == 1.5 and ((val('calibrate([10, 10], [0, 0])') == 5 and val('calibrate([10, 10, 10], [0])') == 5) or (val('calibrate(10, 5)') == 7.5 and val('calibrate(80, 20)') == 50))`,
        hint: "average should return the mean of the list, and calibrate should return the midpoint between the white and black averages." },
      // Read as in the output check. The threshold is 40 here, so 45 is white. None of the samples (66 and 14), nor
      // their averages, sums or difference, is a reading, so a line showing them next to both colour words gives no
      // reading a colour. Samples of 60 and 20 did, which rejected 'White: [60, 60] Black: [20, 20]' on one line, and
      // both averages on one line (samples_one_line, avgs_one_line_rounded, avgs_one_line_f0).
      { expr: py`${CH12_S3_COLOURS}(rerun({'white_samples': '[66, 66]', 'black_samples': '[14, 14]'})[0], [(20, 'black'), (45, 'white'), (8, 'black'), (60, 'white')])`,
        hint: "Work the threshold out from the samples: when I changed them, the readings should be judged with the new threshold." },
    ],
  },
  // content bug: the buttons launch Run1, then report 'Run 3 not implemented', so Run2 and square_on_line never
  // run from the menu. The rule accepts that, and the probes call them directly.
  // end_run()'s message is up to the kid, so the prototype's 'Run complete!' count became a count of the
  // kid's own end_run line (ALT_own_messages).
  ch12_boss: {
    output: [{ expr: py`has('not implemented') and (lambda e: len(e) > 0 and L.count(e[-1]) == 1)(callf('end_run')[1])`,
      hint: "Go through the buttons so Run1 runs once, then the menu moves on and prints 'Run 3 not implemented'." }],
    probes: [
      { expr: py`ns.get('BLACK_LINE') == 22 and all({'straight', 'turn'} <= set(ns.get(k, {})) for k in ('SPEED_FAST', 'SPEED_SLOW'))`,
        hint: "Keep BLACK_LINE = 22, and make SPEED_FAST and SPEED_SLOW dictionaries with 'straight' and 'turn' keys." },
      // The default must be 600, not just a default: speed=500 passed (r3_arm_default_500). The task doesn't say the
      // arms print their speed, so the default is read from the function, or else from what it prints.
      { expr: py`sig('right_arm') == (2, 1) and sig('left_arm') == (2, 1) and all((lambda f: (getattr(f, '__defaults__', None) or ())[-1:] == (600,) or (getattr(f, '__kwdefaults__', None) or {}).get('speed') == 600 or numset([600], L=callf(n, 5)[1]))(ns[n]) for n in ('right_arm', 'left_arm'))`,
        hint: "Give right_arm and left_arm a speed parameter that defaults to 600." },
      { expr: py`(lambda t: len(t) >= 4 and not re.search(r'\b14\b', '\n'.join(t)) and re.search(r'(?i)aligned|squared', '\n'.join(t)))(callf('square_on_line', ns['approach'], ns['align'])[1])`,
        hint: "square_on_line should print both phases, and stop phase 2 as soon as both sensors are below BLACK_LINE." },
      // Phase 2 mustn't stop while only one sensor is on the line: with 'or', square_on_line stopped at (18, 50),
      // and so printed the same with or without the (14, 12) after it, which a right answer can't (r2_phase2_or).
      { expr: py`callf('square_on_line', [(80, 80), (18, 50)], [(18, 50), (14, 12)])[1] != callf('square_on_line', [(80, 80), (18, 50)], [(18, 50)])[1]`,
        hint: "square_on_line's phase 2 should keep wiggling while only one sensor is below BLACK_LINE, and stop only when both are." },
      // The prototype stood in for "3+ moves" with 8+ printed lines, which a one-line launch() and end_run()
      // miss (ALT_own_messages). Run1 must print at least 4 lines (3 moves and an arm move) more than launch,
      // apply_speed and end_run do. apply_speed's own lines are counted, since the task doesn't say it prints
      // (ALT_silent_speed). The task names apply_speed, so the call is checked too.
      { expr: py`(lambda r, a, s, b: (lambda cs: cs[:1] == ['launch'] and cs[-1:] == ['end_run'] and 'apply_speed' in cs and any(c in ('right_arm', 'left_arm') for c in cs))([c for c, p in r[2] if p == 'Run1']) and len(r[1]) >= len(a) + len(s) + len(b) + 4)(callt('Run1()'), callf('launch')[1], callf('apply_speed', ns['SPEED_FAST'])[1], callf('end_run')[1])`,
        hint: "Run1 should call launch() first, then apply_speed, at least 3 moves and one arm move, and end_run() last." },
      { expr: py`(lambda cs: cs[:1] == ['launch'] and 'square_on_line' in cs and cs[-1:] == ['end_run'])([c for c, p in callt('Run2()')[2] if p == 'Run2'])`,
        hint: "Run2 should call launch(), then square_on_line with the test data, and end_run() last." },
      // Task step 6's "at least 2 moves after": the probe above checks only the calls' order, so a Run2 with
      // nothing between square_on_line and end_run passed (r1_run2_no_moves). A move is a call to another of the
      // kid's functions after square_on_line, or a printed line beyond what launch, apply_speed, square_on_line
      // and end_run print, since moves may be printed directly.
      { expr: py`(lambda r, a, sp, q, b: (lambda cs: len([c for c in cs[cs.index('square_on_line') + 1:] if c not in ('launch', 'apply_speed', 'square_on_line', 'end_run')]) >= 2 or len(r[1]) >= len(a) + cs.count('apply_speed') * len(sp) + len(q) + len(b) + 2)([c for c, p in r[2] if p == 'Run2']))(callt('Run2()'), callf('launch')[1], callf('apply_speed', ns['SPEED_SLOW'])[1], callf('square_on_line', ns['approach'], ns['align'])[1], callf('end_run')[1])`,
        hint: "Run2 should make at least 2 moves after square_on_line, before end_run()." },
      // Phase 1 must stop at the first reading with either sensor on the line, so readings after it can't change
      // what square_on_line prints. The test data hides 'and' there, since phase 1 then just runs out of
      // readings (r1_phase1_and).
      { expr: py`callf('square_on_line', [(80, 80), (18, 50)], [(18, 50), (18, 20), (14, 12)])[1] == callf('square_on_line', [(80, 80), (18, 50), (60, 70), (90, 90)], [(18, 50), (18, 20), (14, 12)])[1]`,
        hint: "square_on_line's phase 1 should stop as soon as either sensor is below BLACK_LINE, even when more readings follow." },
      { expr: py`'Run2' not in trace`, hint: "With these buttons the menu never reaches Run2: center runs Run1 and moves to 2, then right moves to 3." },
      // Other buttons, so a menu typed in as prints ('=== Program 2 ===', 'Run 3 not implemented') fails
      // (r1_menu_hardcoded): 'right' then 'center' must launch Run2.
      { expr: py`'Run2' in rerun({'buttons': "['right', 'center']"})[1].trace`,
        hint: "Your menu should work for any buttons list: with buttons = ['right', 'center'] it should launch Run2." },
    ],
  },
  grind_20: {
    output: [{ expr: py`nums([300, 400, 300, 1000])`, hint: "Print the distance for each of the 3 segments, then the total distance." }],
    probes: [
      { expr: py`nums([5, 4, 9], L=rerun({'waypoints': '[(0, 0), (3, 4), (3, 0)]'})[0])`,
        hint: "Work each distance out from the waypoints with the formula, so the answers change when the waypoints do." },
      { expr: py`(lambda w: (rerun(patches={'math.sqrt': w[0]}), len(w[1]) >= 3)[1])(rec('math.sqrt'))`,
        hint: "Use math.sqrt to work out each distance, as the task shows." },
    ],
  },
  // Within 0.051, as in grind_22, so times rounded to one decimal (0.7, 1.3, 0.8, 2.8) count: the task sets no
  // precision, and the prototype's 0.006 rejected them (r1_one_decimal).
  grind_21: {
    output: [{ expr: py`nums_approx([0.67, 1.33, 0.75, 2.75], tol=0.051)`, hint: "Print each segment's time (distance / speed), then the total time." }],
    probes: [{ expr: py`nums_approx([2.0, 2.0], tol=0.051, L=rerun({'segments': "[{'dist': 100, 'speed': 50}]"})[0])`,
      hint: "Work each time out from the segment's dist and speed, so the answers change when the segments do." }],
  },
  // Within 0.5 instead of exact, so an average rounded to one decimal (42.9, ALT_loop_round) or to a whole number
  // (43, r3_round_int_avg) counts, as in ch12_s3: the task sets no precision, and the other values are whole
  // numbers, which 0.5 still tells apart. The task lists what to find but sets no print order, so the minimum,
  // maximum and average may come in any order, and then the count and the index in either order: the prototype's
  // fixed order rejected the maximum printed first (r2_max_first).
  grind_22: {
    output: [{ expr: py`(lambda S: any(nums_approx(list(a) + list(b), tol=0.5) for a in [(x, y, z) for x in S for y in S for z in S if len({x, y, z}) == 3] for b in ((6, 10), (10, 6))))((10, 80, 42.85))`,
      hint: "Print the minimum, the maximum, the average, how many readings are below 22, and the index of the first one." }],
    probes: [{ expr: py`(lambda S, t: any(nums_approx(list(a) + list(b), tol=0.5, L=t) for a in [(x, y, z) for x in S for y in S for z in S if len({x, y, z}) == 3] for b in ((2, 1), (1, 2))))((10, 50, 27.5), rerun({'readings': '[50, 20, 30, 10]'})[0])`,
      hint: "Work everything out from the readings list, so the answers change when the readings do." }],
  },
  // content bug: all 4 runs fit in 150 s (136 s in total), so the time limit never matters with the task's data.
  // The rule accepts all 4 runs, and the MATCH_TIME = 75 and 110 reruns test the limit: greedy and best agree
  // there, on Run1 and Run3 (280 points) and on Run1, Run3 and Run4 (375). The task asks only for the optimal
  // order, so no total has to be printed: the prototype wanted 455 and, in the rerun, 280 (m_ct2_sorted_numbered).
  // The order is the 4 run names next to each other in the output, after repeats of a name in a row are
  // merged ("Run1 ... Run1 fits!"). The prototype took the last 4 names, so a closing "Most efficient run: Run1"
  // broke it (r1_best_run_after); a list in the given order printed before the sorted one is still fine.
  grind_23: {
    output: [
      { expr: py`(lambda N: (lambda n: any(n[i:i + 4] == ['Run1', 'Run3', 'Run4', 'Run2'] for i in range(len(n))))([x for i, x in enumerate(N) if i == 0 or N[i - 1] != x]))(re.findall(r'\bRun[1-4]\b', out))`,
        hint: "Sort the runs by points per second (points / time), best first, and print them in that order." },
    ],
    probes: [
      // In the 75 s rerun the runs picked are Run1 then Run3, and Run4 mustn't follow them: it only fits if the
      // limit is ignored (no_time_check). See G23_PICKS.
      { expr: py`${G23_PICKS}(rerun({'MATCH_TIME': '75'})[0], ['Run1', 'Run3'], 'Run4', '280')`,
        hint: "Only add a run if it still fits in MATCH_TIME, so a shorter match picks fewer runs." },
      // In a 110 s match Run1, Run3 and Run4 fit (101 s, 375 points; 455 with Run2), so a program that always picks
      // the top two fails (top_two_always): the 75 s rerun picks the top two, and without a total to check it passed.
      { expr: py`${G23_PICKS}(rerun({'MATCH_TIME': '110'})[0], ['Run1', 'Run3', 'Run4'], 'Run2', '375')`,
        hint: "Decide each run by the time left in MATCH_TIME, not by a set number of runs, so every run that still fits gets picked." },
      // Runs whose points per second give another order (Run2, Run4, Run3, Run1), so an order typed in by hand
      // fails (r1_hard_order). All 4 still fit in 150 s.
      { expr: py`(lambda N: (lambda n: any(n[i:i + 4] == ['Run2', 'Run4', 'Run3', 'Run1'] for i in range(len(n))))([x for i, x in enumerate(N) if i == 0 or N[i - 1] != x]))(re.findall(r'\bRun[1-4]\b', '\n'.join(rerun({'runs': "[{'name': 'Run1', 'time': 28, 'points': 50}, {'name': 'Run2', 'time': 35, 'points': 200}, {'name': 'Run3', 'time': 42, 'points': 100}, {'name': 'Run4', 'time': 31, 'points': 95}]"})[0])))`,
        hint: "Work the order out from each run's points and time, so it changes when the runs do." },
      // Runs whose ratios, 2.9 and 2.5, both round down to 2, listed in the wrong order: points // time kept that
      // order, since sorting keeps ties as they come, and passed the data above (r3_int_ratio). Right order: Run3
      // (5.0), Run2, Run1, Run4 (1.0), 140 s in all.
      { expr: py`(lambda N: (lambda n: any(n[i:i + 4] == ['Run3', 'Run2', 'Run1', 'Run4'] for i in range(len(n))))([x for i, x in enumerate(N) if i == 0 or N[i - 1] != x]))(re.findall(r'\bRun[1-4]\b', '\n'.join(rerun({'runs': "[{'name': 'Run1', 'time': 40, 'points': 100}, {'name': 'Run2', 'time': 30, 'points': 87}, {'name': 'Run3', 'time': 20, 'points': 100}, {'name': 'Run4', 'time': 50, 'points': 50}]"})[0])))`,
        hint: "Sort by the exact points / time: when two runs' ratios were close, like 2.9 and 2.5, your order came out wrong." },
    ],
  },
};
