// Grading rules for chapters 9-12 and practice grind_16-23 (ported from rules_c.py). Format: see src/checks.js.
// Each expr is Python, written with String.raw so its backslashes reach Python as typed.
const py = String.raw;

export const BATCH_C = {
  // ---------- Chapter 9 ----------
  ch9_r1: {
    output: [{ expr: py`subseq([r're:.*Round 1!', r're:.*Round 2!', r're:.*Round 3!', r're:.*Round 4!', 'Game Over!']) and L[-1] == 'Game Over!' and not has('Round 5')`,
      hint: "Print 'Round 1!' up to 'Round 4!' as the game goes, then 'Game Over!' when the answer is 'n'." }],
    concepts: [{ expr: py`count(ast.Break) >= 1`, hint: "The task asks you to use break to stop the loop when the answer is 'n'." }],
    probes: [{ expr: py`(lambda t: subseq([r're:.*Round 1!', r're:.*Round 2!', 'Game Over!'], L=t) and not has('Round 3', L=t))(rerun({'responses': "['y', 'n']"})[0])`,
      hint: "Read each answer from responses[i] and stop when it is 'n', so the game works for any list of answers." }],
  },
  // The flips are the first 10 lines naming one side of the coin; the tally is whatever comes after them.
  // The prototype counted exactly 10 such lines and read the tally from the last 2 lines, which rejected a
  // tally printed as "Heads: 4" / "Tails: 6" (ALT_two_line_tally).
  ch9_r2: {
    output: [
      { expr: py`len([l for l in L if re.search(r'\b(Heads|Tails)\b', l) and not (('Heads' in l) and ('Tails' in l))]) >= 10`,
        hint: "Print every flip on its own line, so I can see all 10 Heads or Tails results." },
      { expr: py`(lambda k: numset([sum('Heads' in L[j] for j in k[:10]), sum('Tails' in L[j] for j in k[:10])], L=L[k[9] + 1:]))([j for j, l in enumerate(L) if re.search(r'\b(Heads|Tails)\b', l) and not (('Heads' in l) and ('Tails' in l))])`,
        hint: "After the 10 flips, print how many Heads and how many Tails you counted. They must match the flips you printed." },
    ],
    probes: [
      { expr: py`sig('flip_coin') == (0, 0) and {callf('flip_coin')[0] for _ in range(200)} == {'Heads', 'Tails'}`,
        hint: "Make a function flip_coin() with no inputs that returns 'Heads' or 'Tails' using random.choice." },
      // Scripted flips instead of the prototype's "always Tails", which a program that prints one flip and
      // counts another also passes (double_flip).
      { expr: py`(lambda t: (lambda k: [('Heads' if 'Heads' in t[j] else 'Tails') for j in k[:10]] == ['Heads', 'Tails', 'Tails', 'Heads', 'Tails', 'Tails', 'Tails', 'Heads', 'Tails', 'Tails'] and numset([3, 7], L=t[k[9] + 1:]))([j for j, l in enumerate(t) if re.search(r'\b(Heads|Tails)\b', l) and not (('Heads' in l) and ('Tails' in l))]))(rerun(patches={'random.choice': seq(['Heads', 'Tails', 'Tails', 'Heads', 'Tails', 'Tails', 'Tails', 'Heads', 'Tails', 'Tails'])})[0])`,
        hint: "Call flip_coin() once for each flip, then print and count that same result." },
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
      { expr: py`(lambda r: (r.ns.get('player_wins'), r.ns.get('enemy_wins'), r.ns.get('ties')) == (2, 2, 1))(rerun(patches={'random.randint': seq([6, 1, 1, 6, 3, 3, 5, 2, 2, 5])})[1])`,
        hint: "When I picked the dice rolls, your counters came out wrong. The higher roll wins the round, and equal rolls are a tie." },
      { expr: py`rerun(patches={'random.randint': lambda a, b: 4})[1].ns.get('ties') == 5`,
        hint: "When both dice show the same number, it's a tie: add 1 to ties, not to a winner." },
      { expr: py`(lambda r: sorted([r.ns.get('player_wins'), r.ns.get('enemy_wins')]) == [0, 5] and r.ns.get('ties') == 0)(rerun(patches={'random.randint': seq([6, 1])})[1])`,
        hint: "Roll both dice with random.randint(1, 6) inside the loop, and give the round to whoever rolled higher." },
    ],
  },
  ch9_r4: {
    output: [{ expr: py`subseq(['Guess 5 accepted!', '15 is out of range! Must be 1-10.', '0 is out of range! Must be 1-10.', 'Guess 8 accepted!', 'Guess 3 accepted!', '-1 is out of range! Must be 1-10.', 'Guess 10 accepted!'])`,
      hint: "For each guess in the list, print 'Guess 5 accepted!' or '15 is out of range! Must be 1-10.', in the same order as the list." }],
    // The prototype wanted exactly 4 printed lines; a heading printed by the function is fine (ALT_and_check).
    probes: [{ expr: py`(lambda r: r[0] == [1, 10] and subseq(['Guess 1 accepted!', '11 is out of range! Must be 1-10.', 'Guess 10 accepted!', '0 is out of range! Must be 1-10.'], L=r[1]))(callf('validate_guess', [1, 11, 10, 0]))`,
      hint: "validate_guess(guesses) should print a line for every guess and return a list of only the good guesses (1 to 10)." }],
  },
  ch9_r5: {
    output: [{ expr: py`len(L) >= 6 and len(ints(L[-1])) >= 1`,
      hint: "Show the cards for all 5 rounds, then print the final score on the last line." }],
    probes: [
      { expr: py`nums([3], L=rerun(patches={'random.randint': seq(list(range(1, 14)))})[0][-1:])`,
        hint: "When I made every card bigger than the one before, your score was wrong. 'high' is right when the next card is bigger." },
      { expr: py`nums([2], L=rerun(patches={'random.randint': seq(list(range(13, 0, -1)))})[0][-1:])`,
        hint: "When I made every card smaller than the one before, your score was wrong. 'low' is right when the next card is smaller." },
      { expr: py`all(isinstance(v, int) and 1 <= v <= 13 for v in [callf('draw_card')[0] for _ in range(100)])`,
        hint: "Make a function draw_card() that returns random.randint(1, 13)." },
      { expr: py`(lambda w: (rerun(patches={'random.seed': w[0]}), (42,) in w[1])[1])(rec('random.seed'))`,
        hint: "Keep random.seed(42) at the top of your program, as the task says." },
    ],
  },
  ch9_s1: {
    output: [{ expr: py`len(L) == 4 and L[0] == '=' * 30 and L[3] == '=' * 30 and L[1].strip() == 'DRAGON QUEST' and 8 <= len(L[1]) - len(L[1].lstrip()) <= 10 and L[2] == 'Press ENTER to start'`,
      hint: "Print 4 lines: 30 '=' signs, the game name in the middle of a 30-character line, 'Press ENTER to start', then 30 '=' again." }],
    // The prototype's two probes, swapped so a program with no show_title at all hears about the function first.
    probes: [
      { expr: py`sig('show_title') == (1, 0)`, hint: "Make a function show_title with exactly one parameter, game_name, and call it with 'DRAGON QUEST'." },
      { expr: py`(lambda t: len(t) == 4 and t[1].strip() == 'HI' and 13 <= len(t[1]) - len(t[1].lstrip()) <= 15)(callf('show_title', 'HI')[1])`,
        hint: "show_title should center any name you give it, not only DRAGON QUEST. Try the string method .center(30)." },
    ],
  },
  ch9_s2: {
    output: [{ expr: py`lines(['5', '4', '3', '2', '1', r're:.*BLAST OFF!', 'launched'])`,
      hint: "Count down from 5 to 1, print '🚀 BLAST OFF!', then print what countdown returned." }],
    probes: [{ expr: py`(lambda r: r[0] == 'launched' and r[1][:3] == ['3', '2', '1'] and 'BLAST OFF!' in r[1][3])(callf('countdown', 3))`,
      hint: "countdown(n) should count down from whatever n it gets, print BLAST OFF!, and return 'launched'." }],
  },
  ch9_s3: {
    output: [{ expr: py`lines([r're:.*Fight!', r're:.*Inventory', r're:.*Fight!', r're:.*Goodbye!'])`,
      hint: "Go through the choices in order: '1' prints Fight!, '2' prints Inventory and '3' prints Goodbye!." }],
    concepts: [{ expr: py`count(ast.Break) >= 1`, hint: "The task asks you to use break to leave the loop when the choice is '3'." }],
    probes: [{ expr: py`lines([r're:.*Inventory', r're:(?i).*unknown choice.*', r're:.*Goodbye!'], L=rerun({'choices': "['2', '9', '3', '1']"})[0])`,
      hint: "Your menu should work for any list of choices: print 'Unknown choice' for anything else, and stop at '3'." }],
  },
  ch9_boss: {
    // The task says 'Print each round: moves and who won', so both are counted (no_round_winner prints only
    // the moves). The prototype counted only win/tie words, but printing get_winner's answer ('player',
    // ALT_beats_dict) or 'Winner: You' (ALT_winner_label) has none, so a line ending in player/computer/tie
    // and the word 'winner' count too, and so do lose/loses/lost ("You lose this round").
    output: [{ expr: py`len([l for l in L if re.search(r'(?i)\b(rock|paper|scissors)\b', l)]) >= 5 and len([l for l in L if re.search(r'(?i)\b(win|wins|won|winner|tie|draw|lose|loses|lost)\b|\b(player|computer|tie)\W*$', l)]) >= 5`,
      hint: "Print each of the 5 rounds: both moves and who won." }],
    probes: [
      { expr: py`all(val('get_winner(%r, %r)' % (p, c)) == w for p, c, w in [('rock','rock','tie'), ('rock','paper','computer'), ('rock','scissors','player'), ('paper','rock','player'), ('paper','paper','tie'), ('paper','scissors','computer'), ('scissors','rock','computer'), ('scissors','paper','player'), ('scissors','scissors','tie')])`,
        hint: "Check get_winner for every pair of moves: rock beats scissors, scissors beats paper, paper beats rock, and the same move is a 'tie'." },
      { expr: py`(lambda t: numset([2], L=t[-2:]) and not numset([3], L=t[-2:]))(rerun(patches={'random.choice': seq(['scissors', 'rock', 'rock', 'rock', 'scissors'])})[0])`,
        hint: "When I picked the computer's moves, your final score was wrong. Add 1 to the winner's score each round and print both scores at the end." },
      { expr: py`(lambda w: (rerun(patches={'random.seed': w[0]}), (42,) in w[1])[1])(rec('random.seed'))`,
        hint: "Keep random.seed(42) at the top of your program, as the task says." },
    ],
  },
  grind_16: {
    output: [{ expr: py`has('Will I win?', 'Is it sunny?', 'Should I go?')`, hint: "Print each of the 3 questions, in order." }],
    probes: [
      { expr: py`ns.get('responses') == ['Yes!', 'No!', 'Maybe', 'Ask again'] and ns.get('questions') == ['Will I win?', 'Is it sunny?', 'Should I go?']`,
        hint: "Make the two lists exactly as the task shows: responses with 4 answers and questions with 3 questions." },
      // A different answer each time, not the prototype's "always Maybe", which picking once also passes (choice_once).
      { expr: py`has('Will I win?', 'Yes!', 'Is it sunny?', 'No!', 'Should I go?', 'Ask again', L=rerun(patches={'random.choice': seq(['Yes!', 'No!', 'Ask again'])})[0])`,
        hint: "Pick a new random.choice(responses) for each question inside your loop, and print it after the question." },
      { expr: py`(lambda w: (rerun(patches={'random.seed': w[0]}), (42,) in w[1])[1])(rec('random.seed'))`,
        hint: "Keep random.seed(42) at the top of your program, as the task says." },
    ],
  },
  // content bug: seed 42 makes the secret 4, below every guess, so the reference prints 'Too high' 5 times and
  // 'Correct!' and the break never run. The rule accepts that, and the probes patch in other secrets to test them.
  // The prototype counted every printed line, which rejected a heading line (ALT_header_while); these
  // count only the hint lines.
  grind_17: {
    output: [{ expr: py`[m.group().lower() for m in (re.search(r'(?i)too high|too low|correct', l) for l in L) if m] == ['too high'] * 5`,
      hint: "Compare each guess with the secret number and print 'Too high', 'Too low' or 'Correct!'." }],
    probes: [
      { expr: py`[m.group().lower() for m in (re.search(r'(?i)too high|too low|correct', l) for l in rerun(patches={'random.randint': lambda a, b: 12})[0]) if m] == ['too low', 'too low', 'too high', 'correct']`,
        hint: "When I changed the secret number, your hints were wrong. Print 'Correct!' when the guess equals the secret, then stop the loop with break." },
      { expr: py`[m.group().lower() for m in (re.search(r'(?i)too high|too low|correct', l) for l in rerun(patches={'random.randint': lambda a, b: 10})[0]) if m] == ['correct']`,
        hint: "When the first guess is right, print 'Correct!' and stop: nothing should be printed after it." },
    ],
  },

  // ---------- Chapter 10 ----------
  ch10_r1: {
    output: [{ expr: py`isinstance(val('setup_quiz()'), list) and all(d['q'] in out for d in val('setup_quiz()'))`,
      hint: "Make setup_quiz() return your 3 questions, and print each question when you ask it." }],
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
    output: [{ expr: py`isinstance(ns.get('questions'), list) and len(ns['questions']) == 3 and nums([sum(a == q['answer'] for a, q in zip(ns['simulated_answers'], ns['questions'])), 3], L=L[-1:])`,
      hint: "Add your 3 questions, then print the final score out of 3 on the last line, counting only the simulated answers that are right." }],
    probes: [
      { expr: py`all(isinstance(q, dict) and isinstance(q.get('choices'), list) and type(q.get('answer')) is int and 'q' in q for q in ns.get('questions', [0]))`,
        hint: "Each question should be a dictionary with 'q', a 'choices' list, and an 'answer' that is the number (index) of the right choice." },
      { expr: py`(lambda t: 'Zed?' in t and '7' in t and all(c in t for c in ['Ann', 'Bo', 'Cy']))('\n'.join(callf('display_question', {'q': 'Zed?', 'choices': ['Ann', 'Bo', 'Cy'], 'answer': 2}, 7)[1]))`,
        hint: "display_question(q, num) should print the question number, the question and every choice." },
      { expr: py`callf('check_answer', {'q': 'Z', 'choices': ['a', 'b', 'c'], 'answer': 2}, 2)[0] is True and callf('check_answer', {'q': 'Z', 'choices': ['a', 'b', 'c'], 'answer': 2}, 0)[0] is False`,
        hint: "check_answer(q, player_choice) should return True when player_choice equals q['answer'], and False when it doesn't." },
    ],
  },
  ch10_r3: {
    // The prototype read every line naming potion, arrow or sword, so add_item and remove_item messages such
    // as "Added 3 potion" broke it (ALT_messages). Instead, what the kid's own show_inventory prints for the
    // two expected inventories must appear, in order; a probe below checks that it shows the counts.
    output: [{ expr: py`(lambda a, b: len(a) > 0 and len(b) > 0 and subseq(a + b))(callf('show_inventory', {'potion': 3, 'sword': 1, 'arrow': 2})[1], callf('show_inventory', {'potion': 2, 'sword': 1})[1])`,
      hint: "Show the inventory twice: after adding 3 potions, 1 sword and 2 arrows, and again after removing 1 potion and 2 arrows." }],
    probes: [
      { expr: py`ns.get('inventory') == {'potion': 2, 'sword': 1}`,
        hint: "After your test, inventory should hold 2 potions and 1 sword, and no arrows at all." },
      { expr: py`(lambda d: (callf('add_item', d, 'x'), callf('add_item', d, 'x', 2), d == {'x': 3})[2])({})`,
        hint: "add_item should add to the count when the item is already there, and add 1 when no qty is given." },
      { expr: py`(lambda d: (callf('remove_item', d, 'x', 2), d == {})[1])({'x': 2})`,
        hint: "remove_item should take away qty, and delete the item with del when its count reaches 0." },
      // The output check above is format-free, so this makes show_inventory show the counts (names_only). As the
      // prototype did, any number on a line naming the item counts, so 'Item: potion, Qty: 3', 'potions: 3' and
      // print(inv) all pass (ALT_item_qty, ALT_plural, ALT_print_dict).
      { expr: py`(lambda t: all(any(i in l.lower() and n in ints(l) for l in t) for i, n in (('potion', 3), ('arrow', 2))))(callf('show_inventory', {'potion': 3, 'arrow': 2})[1])`,
        hint: "show_inventory should print each item with its count, like 'potion: 3'." },
      { expr: py`any('Empty!' in l for l in callf('show_inventory', {})[1])`,
        hint: "show_inventory should print 'Empty!' when there is nothing in the inventory." },
    ],
  },
  ch10_r4: {
    output: [{ expr: py`len(L) >= 3`, hint: "Print the story as it happens: the start, the cave, and how the adventure ends." }],
    probes: [
      { expr: py`'scene_start' in trace and 'scene_left' in trace and 'scene_right' not in trace and trace.index('scene_start') < trace.index('scene_left')`,
        hint: "Run your adventure by calling scene_start(), then scene_left() because the first choice is 'left'. Don't call scene_right() on this path." },
      { expr: py`(lambda r: 'scene_right' in r[1].trace and 'scene_left' not in r[1].trace and any('treasure found!' in l for l in r[0]))(rerun({'choices': "['right']"}))`,
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
    ],
  },
  ch10_s1: {
    // A count may come before its rarity too ("6 common"): the prototype only allowed "common: 6" (ALT_number_first).
    output: [{ expr: py`(lambda R: (lambda drops, rest: len(drops) >= 10 and all((lambda c: any(re.search(r'(?i)\b%s\b\D*\b%d\b|\b%d\W+%s\b' % (r, c, c, r), s) for s in rest))(sum(R[[n for n in R if n in d][0]] == r for d in drops[:10])) for r in ('common', 'rare', 'legendary')))([l for l in L if any(n in l for n in R)], [l for l in L if not any(n in l for n in R)]))({'Gold Coin': 'common', 'Health Potion': 'common', 'Magic Ring': 'rare', 'Dragon Scale': 'legendary'})`,
      hint: "Print each of the 10 drops with the item's name, then how many common, rare and legendary items you got." }],
    probes: [
      { expr: py`all(callf('get_drop', ns['loot_table'])[0] in ns['loot_table'] for _ in range(50))`,
        hint: "get_drop(table) should return one of the items from the loot table." },
      { expr: py`(lambda rs: abs(rs.count('common') / 2000 - 0.6) < 0.05 and abs(rs.count('rare') / 2000 - 0.3) < 0.05 and abs(rs.count('legendary') / 2000 - 0.1) < 0.04)([callf('get_drop', ns['loot_table'])[0]['rarity'] for _ in range(2000)])`,
        hint: "Use random.randint(1, 100) so common items drop about 60% of the time, rare 30% and legendary 10%." },
    ],
  },
  ch10_s2: {
    output: [
      { expr: py`len([l for l in L if any(n in l for n in ('Goblin', 'Skeleton', 'Troll', 'Ghost'))]) == 5`,
        hint: "Print all 5 enemies, each with its name from the names list." },
      { expr: py`sum(61 <= v <= 70 for v in ints(out)) >= 5 and sum(10 <= v <= 14 for v in ints(out)) >= 5`,
        hint: "Print each enemy's hp and attack. At level 3, hp is 61 to 70 and attack is 10 to 14." },
    ],
    probes: [
      { expr: py`all((lambda e: e['name'] in ns['names'] and 61 <= e['hp'] <= 70 and 10 <= e['attack'] <= 14)(callf('generate_enemy', 3)[0]) for _ in range(200))`,
        hint: "generate_enemy(level) should return a dictionary with a random 'name' from names, plus 'hp' and 'attack'." },
      { expr: py`(lambda es: all(21 <= e['hp'] <= 30 and 4 <= e['attack'] <= 8 for e in es) and len({e['name'] for e in es}) >= 2)([callf('generate_enemy', 1)[0] for _ in range(200)])`,
        hint: "Use the level in your formulas, so a level 1 enemy is weaker than a level 3 one." },
    ],
  },
  ch10_s3: {
    output: [{ expr: py`subseq([r're:.*Bob.*1200.*', r're:.*Eve.*1100.*', r're:.*Dave.*950.*']) and 'Alice' not in out and 'Carol' not in out`,
      hint: "Show only the top 3 scores, highest first, with each name and score." }],
    probes: [
      { expr: py`[d.get('score') for d in ns.get('scores', [])] == [1200, 1100, 950, 850, 650]`,
        hint: "add_score should keep the scores list sorted from highest to lowest. Use table.sort() so the list itself changes." },
      { expr: py`(lambda t: (callf('add_score', t, 'Z', 5), callf('add_score', t, 'Y', 9), [d['score'] for d in t] == [9, 5])[2])([])`,
        hint: "add_score(table, name, score) should add a {'name': ..., 'score': ...} dictionary and then sort the table." },
      { expr: py`sig('show_top') == (2, 1) and (lambda t: len([l for l in callf('show_top', t, 1)[1] if 'A1' in l or 'B2' in l]) == 1)([{'name': 'A1', 'score': 2}, {'name': 'B2', 'score': 1}])`,
        hint: "show_top(table, n=3) should print only the top n entries, and n should be 3 when you don't give it." },
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
      // KeyError on a missing exit leaves alone too (no_exit_check).
      { expr: py`(lambda p: (lambda r: not (type(r[0]) is tuple and r[0][:1] == ('__error__',)) and p['location'] == 'start')(callf('move', ns['rooms'], p, 'nowhere')))({'location': 'start', 'inventory': [], 'hp': 50})`,
        hint: "move should only change the player's location when that exit exists. Otherwise, leave them where they are." },
      { expr: py`(lambda p: (callf('pickup', p, 'rope'), 'rope' in p['inventory'])[1])({'location': 'start', 'inventory': [], 'hp': 50})`,
        hint: "pickup(player, item) should add the item to player['inventory']." },
    ],
  },
  grind_18: {
    output: [{ expr: py`nums([50, 40, 10])`, hint: "Buy the Sword, then the Potion, then the Shield, and print the gold left after each one." }],
    probes: [{ expr: py`val("buy(items, 'Sword', 40)") == -1 and val("buy(items, 'Potion', 10)") == 0 and val("buy(items, 'Shield', 100)") == 70`,
      hint: "buy(items, name, gold) should return the gold left after paying, or -1 if the item costs more than the gold." }],
  },
  grind_19: {
    output: [
      { expr: py`nums([60, 85, 40, 70, 20, 55, 0])`, hint: "Print the HP after every attack, and keep taking turns until someone reaches 0." },
      // The prototype's wording allowed only "is" before the verb, so "The Dragon has been defeated!" failed
      // (ALT_while_true), and "The Hero defeated the Dragon!" too (ALT_active_voice). "has", "has been" and
      // "was" are allowed now, and so is "<winner> defeated the <loser>", here and in the probe.
      // Because the auxiliary is optional, "The Dragon defeated the Hero" would also read as "Dragon defeated",
      // so the lookahead rules out the other fighter's name right after the verb (winner_not_checked,
      // only_enemy_check_active, swapped_winner). It needs whitespace, not punctuation, so a new sentence
      // such as "The Dragon is defeated. The Hero survives" still counts (ALT_survivor_hp).
      { expr: py`bool(re.search(r'(?i)\bhero\b\W*(has\W+|is\W+|was\W+)?(wins|won|the winner|victorious)|\bdragon\b\W*(is\W+|was\W+|has\W+been\W+|has\W+)?(defeated|loses|lost|dies|died|fell|fallen|falls|beaten)(?!\s+(the\s+)?hero\b)|\bhero\b\W*(has\W+)?(defeated|defeats|beat|beats|slew|slays)\W+(the\W+)?dragon\b', L[-1]))`,
        hint: "At the end, print who won the battle." },
    ],
    probes: [{ expr: py`(lambda s: bool(re.search(r'(?i)\bdragon\b\W*(has\W+|is\W+|was\W+)?(wins|won|the winner|victorious)|\bhero\b\W*(is\W+|was\W+|has\W+been\W+|has\W+)?(defeated|loses|lost|dies|died|fell|fallen|falls|beaten)(?!\s+(the\s+)?dragon\b)|\bdragon\b\W*(has\W+)?(defeated|defeats|beat|beats|slew|slays)\W+(the\W+)?hero\b', s)))(rerun({'player': "{'name': 'Hero', 'hp': 20, 'attack': 5}"})[0][-1])`,
      hint: "When I made the Hero weaker, your battle didn't say the Dragon won. Stop as soon as either HP reaches 0, and print the real winner." }],
  },

  // ---------- Chapter 11 (robotics) ----------
  // Chapters 11-12 and grind_20-23 grade the tasks' own print and dict simulations; there is no pybricks mock.
  ch11_r1: {
    output: [{ expr: py`all(re.search(p, out) for p in [r'PrimeHub', r'\bZ\b', r'\bY\b', r'\bD\b', r'counterclockwise', r'\bC\b', r'(?<!counter)clockwise', r'62\.4', r'(?<!\d)80(?!\d)'])`,
      hint: "Print every setting: the hub's name and sides, each motor's port and direction, and the wheel diameter and axle track." }],
    probes: [
      { expr: py`ns.get('hub') == {'name': 'PrimeHub', 'top_side': 'Z', 'front_side': 'Y'} and ns.get('left_motor') == {'port': 'D', 'direction': 'counterclockwise'} and ns.get('right_motor') == {'port': 'C', 'direction': 'clockwise'} and ns.get('drive_base', {}).get('wheel_diameter') == 62.4 and ns['drive_base'].get('axle_track') == 80`,
        hint: "Make the dictionaries exactly as the task shows: hub, left_motor, right_motor and drive_base, with the same keys and values." },
      { expr: py`ns['drive_base'].get('left') is ns['left_motor'] and ns['drive_base'].get('right') is ns['right_motor']`,
        hint: "In drive_base, use the motor variables themselves ('left': left_motor), not a new copy of the dictionary." },
    ],
  },
  ch11_r2: {
    output: [
      { expr: py`subseq([r're:Driving 200 ?mm forward', r're:Turning 90 ?(°|deg\w*)? ?right', r're:Driving 150 ?mm forward', r're:Turning -?45 ?(°|deg\w*)? ?left', r're:Driving -?100 ?mm backward'])`,
        hint: "Use your functions for each move in order: 200mm forward, 90° right, 150mm forward, 45° left, 100mm backward." },
      { expr: py`nums([450], L=L[-1:])`, hint: "Print total_distance on the last line. Count every drive as a positive distance, even backward ones." },
    ],
    probes: [
      { expr: py`any(re.fullmatch(r'Driving -?30 ?mm backward', l) for l in callf('robot_straight', -30)[1])`,
        hint: "Make robot_straight(distance) print the drive, and say 'backward' when the distance is negative." },
      { expr: py`any(re.fullmatch(r'Turning -?10 ?(°|deg\w*)? ?left', l) for l in callf('robot_turn', -10)[1])`,
        hint: "robot_turn(angle) should say 'left' when the angle is negative." },
      { expr: py`ns.get('total_distance') == 450`, hint: "Keep total_distance up to date: add the size of every drive, using abs() for the backward one." },
    ],
  },
  ch11_r3: {
    output: [
      { expr: py`subseq([r're:Right arm: -240 ?(°|deg\w*)? at speed 600', r're:Left arm: 110 ?(°|deg\w*)? at speed 250', r're:Left arm: 40 ?(°|deg\w*)? at speed 100', r're:Right arm: 195 ?(°|deg\w*)? at speed 800'])`,
        hint: "Call the arm functions in the task's order, and give the speed only when it isn't 600." },
      { expr: py`nums([4], L=L[-1:])`, hint: "Count each arm movement and print how many there were on the last line." },
    ],
    probes: [
      { expr: py`sig('right_arm') == (2, 1) and sig('left_arm') == (2, 1)`, hint: "Give both arm functions two parameters, with a default for the speed: (degrees, speed=600)." },
      { expr: py`numset([10, 600], L=callf('right_arm', 10)[1]) and numset([5, 7], L=callf('left_arm', 5, speed=7)[1])`,
        hint: "Your arm functions should print the degrees and the speed they were given." },
      { expr: py`ns.get('movements') == 4`, hint: "Add 1 to movements for every arm move." },
    ],
  },
  ch11_r4: {
    output: [{ expr: py`nums_abs([600, 350, 500, 400, 250, 45, 250, 150, 110, 150, 100, 90])`,
      hint: "Run the 4 segments in order (fast 500mm, normal turn 45°, pushing 110mm, slow turn -90°), setting each speed first." }],
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
    output: [{ expr: py`has('Ready!') and L[-1].endswith('Run complete!') and nums_abs([690, 45, 130, 90, 90, 240])`,
      hint: "Your run should print launch's 'Ready!' first, then the moves (690, 45 right, 130, 90 left, 90, arm -240), and 'Run complete!' last." }],
    probes: [
      { expr: py`'Run1' in trace`, hint: "Call Run1() at the bottom of your program." },
      { expr: py`callees('Run1')[:1] == ['launch'] and callees('Run1')[-1:] == ['end_run']`, hint: "Inside Run1, call launch() first and end_run() last." },
      { expr: py`(lambda t: 'gyro' in t.lower() and 'arm' in t.lower() and 'Ready!' in t)('\n'.join(callf('launch')[1]))`,
        hint: "launch() should print that it resets the gyro and the arms, then 'Ready!'." },
    ],
  },
  ch11_s1: {
    output: [{ expr: py`nums([550, 140, 35, 152]) and len(L) >= 4`, hint: "Print all 4 conversions in mm: 55cm, 14cm, 3.5cm and 6 inches." }],
    probes: [{ expr: py`val('cm_to_mm(2)') == 20 and val('inches_to_mm(1)') == 25 and val('inches_to_mm(2)') == 51`,
      hint: "cm_to_mm should return cm * 10, and inches_to_mm should return round(inches * 25.4)." }],
  },
  ch11_s2: {
    output: [
      { expr: py`subseq([r're:.*left_motor.*straight.*\b400\b.*', r're:.*right_motor.*straight.*\b400\b.*', r're:.*left_arm.*rotate.*-240.*', r're:.*right_arm.*rotate.*\b195\b.*'])`,
        hint: "Print each log entry in order, showing its motor, action and value." },
      { expr: py`nums([4], L=L[-1:])`, hint: "Print the total number of commands on the last line." },
    ],
    probes: [
      { expr: py`ns.get('log') == [{'motor': 'left_motor', 'action': 'straight', 'value': 400}, {'motor': 'right_motor', 'action': 'straight', 'value': 400}, {'motor': 'left_arm', 'action': 'rotate', 'value': -240}, {'motor': 'right_arm', 'action': 'rotate', 'value': 195}]`,
        hint: "Log the 4 commands with log_command, so log ends up holding 4 dictionaries." },
      { expr: py`(lambda l: (callf('log_command', l, 'm', 'a', 1), l == [{'motor': 'm', 'action': 'a', 'value': 1}])[1])([])`,
        hint: "log_command should append one dictionary to the log list it is given. Don't make a new list inside it." },
    ],
  },
  ch11_s3: {
    output: [{ expr: py`nums([90, 180, 135, 315, 45]) and nums([45], L=L[-1:])`,
      hint: "Print the heading after each of the 5 turns, then the final heading on the last line." }],
    concepts: [{ expr: py`binop('Mod') >= 1`, hint: "The task asks you to wrap the heading into 0-359 with % 360." }],
    probes: [
      { expr: py`val('turn(350, 20)') == 10 and val('turn(10, -30)') == 340 and val('turn(0, 720)') == 0`,
        hint: "turn(heading, angle) should always return a heading from 0 to 359, even when the sum goes past 360 or below 0." },
      { expr: py`ns.get('heading') == 45`, hint: "Save the new heading from turn() back into your heading variable after every turn." },
    ],
  },
  ch11_boss: {
    // Unlike ch11_r5, this task leaves launch() and end_run()'s messages up to the kid, so the prototype's
    // 'Ready!' / 'Run complete!' became the kid's own launch output and end_run output last (ALT_own_messages).
    output: [
      { expr: py`nums_abs([ns['SPEED_FAST']['straight'], 690, 45, 130, 90, 90, 240, ns['SPEED_NORMAL']['straight'], 350])`,
        hint: "Run1 should set fast speed, drive 690, turn 45, drive 130, turn 90, drive 90, grab at -240, set normal speed and back up 350, in that order." },
      { expr: py`(lambda a, b: len(a) > 0 and len(b) > 0 and subseq(a) and L[-len(b):] == b)(callf('launch')[1], callf('end_run')[1])`,
        hint: "Start the run with launch() and finish it with end_run(), and make both print a status message." },
    ],
    probes: [
      { expr: py`all({'straight', 'turn'} <= set(ns.get(k, {})) for k in ('SPEED_FAST', 'SPEED_NORMAL'))`,
        hint: "SPEED_FAST and SPEED_NORMAL should be dictionaries with 'straight' and 'turn' keys." },
      { expr: py`sig('right_arm') == (2, 1) and sig('left_arm') == (2, 1) and numset([600], L=callf('left_arm', 5)[1])`,
        hint: "Give right_arm and left_arm a speed parameter that defaults to 600, and print the speed." },
      { expr: py`callees('Run1')[:1] == ['launch'] and callees('Run1')[-1:] == ['end_run'] and callees('Run1').count('apply_speed') >= 2 and 'right_arm' in callees('Run1')`,
        hint: "Run1 should call launch() first, apply_speed twice (fast, then normal), right_arm to grab, and end_run() last." },
    ],
  },

  // ---------- Chapter 12 (robotics, simulated sensor data) ----------
  ch12_r1: {
    // Lower-cased, unlike the prototype, which compared the words as printed, so 'BLACK' failed (ALT_capitals).
    output: [{ expr: py`[w.lower() for w in re.findall(r'(?i)\b(black|white)\b', out)][-8:] == ['black', 'white', 'white', 'black', 'black', 'black', 'white', 'white'] or [w.lower() for w in re.findall(r'(?i)\b(on|off)\b', out)][-8:] == ['on', 'off', 'off', 'on', 'on', 'on', 'off', 'off']`,
      hint: "For each of the 4 readings, print whether the left and right sensors see black or white." }],
    probes: [
      { expr: py`[val('read_sensor(%d)' % v) for v in (0, 21, 22, 90)] == ['black', 'black', 'white', 'white']`,
        hint: "Make read_sensor(value) return 'black' when the value is below BLACK_LINE, and 'white' otherwise (so exactly 22 is 'white')." },
      { expr: py`ns.get('BLACK_LINE') == 22 and trace.count('check_sensors') == 4`,
        hint: "Keep BLACK_LINE = 22, and call check_sensors once for each of the 4 readings." },
      // Calls check_sensors directly: the prototype re-ran with a new readings list, which rejected calling
      // check_sensors with the 4 readings typed in, as the task lists them (ALT_direct_calls).
      { expr: py`(lambda t: [w.lower() for w in re.findall(r'(?i)\b(black|white)\b', t)][-2:] == ['white', 'black'] or [w.lower() for w in re.findall(r'(?i)\b(on|off)\b', t)][-2:] == ['off', 'on'])('\n'.join(callf('check_sensors', 30, 5)[1]))`,
        hint: "check_sensors(left_val, right_val) should use read_sensor to print both sensors, left first." },
    ],
  },
  ch12_r2: {
    output: [
      { expr: py`subseq([r're:(?i).*driving.*\b80\b.*', r're:(?i).*driving.*\b75\b.*', r're:(?i).*driving.*\b60\b.*', r're:(?i).*driving.*\b55\b.*', r're:(?i).*driving.*\b40\b.*', r're:(?i).*line detected.*\b18\b.*'])`,
        hint: "Print a 'Driving...' line for each white reading, then 'LINE DETECTED!' with the first black reading." },
      { expr: py`not re.search(r'sensor: 10\b', out)`, hint: "Stop as soon as you find the line: the reading after it should never be printed." },
      { expr: py`nums([6], L=L[-1:]) or nums([5], L=L[-1:])`, hint: "Print how many ticks drive_until_line returned, on the last line." },
    ],
    probes: [{ expr: py`(lambda a, b: (a[0], b[0]) in [(2, 1), (1, 0)] and not any(re.search(r'\b5\b', l) for l in a[1]))(callf('drive_until_line', [50, 10, 5], 22), callf('drive_until_line', [10], 22))`,
      hint: "drive_until_line should stop at the first reading below the threshold and return how many ticks it drove." }],
  },
  ch12_r3: {
    output: [
      { expr: py`subseq(sum([callf('print_action', a)[1] for a in ['aligned', 'turn_right', 'turn_left', 'drive_forward', 'aligned', 'drive_forward']], []))`,
        hint: "Use print_action to show the action for each of the 6 readings, in order." },
      { expr: py`nums([2], L=L[-1:])`, hint: "Count the 'aligned' readings and print the count on the last line." },
    ],
    probes: [
      { expr: py`[val('analyze_alignment(%d, %d)' % p) for p in [(10, 12), (15, 60), (55, 18), (70, 80), (22, 22), (21, 21)]] == ['aligned', 'turn_right', 'turn_left', 'drive_forward', 'drive_forward', 'aligned']`,
        hint: "analyze_alignment should return 'aligned' only when both values are below BLACK_LINE. A reading of exactly 22 is not on the line." },
      { expr: py`len({tuple(callf('print_action', a)[1]) for a in ['aligned', 'turn_right', 'turn_left', 'drive_forward']}) == 4`,
        hint: "print_action should print a different message for each of the 4 actions." },
    ],
  },
  ch12_r4: {
    output: [
      { expr: py`len([l for l in L if 'driving' in l.lower()]) == 3`, hint: "In phase 1, print 'Driving...' for each reading until one sensor sees the line." },
      { expr: py`[w.lower().replace(' ', '_') for w in re.findall(r'(?i)turn[ _]right|turn[ _]left|aligned|drive[ _]forward', out)] == ['turn_right', 'turn_right', 'turn_right', 'aligned']`,
        hint: "In phase 2, print the action for each reading (turn_right, turn_left or aligned) until both sensors see the line." },
      // Either phase may count its stopping tick or not: the prototype allowed only (4, 4) or (3, 4), which
      // rejected counting only the ticks before each stop, (3, 3) (ALT_count_before).
      { expr: py`has('Squared on line!') and any(nums([a, b], L=L[-2:]) for a in (3, 4) for b in (3, 4))`,
        hint: "Print '✅ Squared on line!' when both sensors are on the line, then the ticks for phase 1 and phase 2." },
    ],
    // A reading after each stopping point, unlike the prototype's data, where the lists end where the phases
    // stop, so loops that never stop passed (no_break).
    probes: [{ expr: py`(lambda t: len([l for l in t if 'driving' in l.lower()]) == 1 and [w.lower().replace(' ', '_') for w in re.findall(r'(?i)turn[ _]right|turn[ _]left|aligned|drive[ _]forward', '\n'.join(t))] == ['turn_right', 'aligned'])(rerun({'approach': '[(80, 80), (10, 90), (80, 80)]', 'alignment': '[(10, 90), (5, 5), (90, 10)]'})[0])`,
      hint: "Your loops should work with other sensor data too: stop phase 1 when either sensor is below 22, and stop phase 2 when both are." }],
  },
  ch12_r5: {
    output: [{ expr: py`lines(['=== Program 2 ===', '=== Program 3 ===', r're:.*Launching Run 3\.\.\.', r're:.*Run 3 complete!', '=== Program 4 ===', r're:.*Launching Run 4\.\.\.', r're:.*Run 4 complete!', '=== Program 1 ===', '=== Program 4 ===', r're:.*Launching Run 4\.\.\.', r're:.*Run 4 complete!', '=== Program 1 ===', r're:.*Launching Run 1\.\.\.', r're:.*Run 1 complete!', '=== Program 2 ==='])`,
      hint: "Show the menu after every button press. 'center' runs the program and then moves to the next one, and 4 wraps back to 1." }],
    probes: [
      { expr: py`lines(['=== Program 4 ===', r're:.*Launching Run 4\.\.\.', r're:.*Run 4 complete!', '=== Program 1 ==='], L=rerun({'buttons': "['left', 'center']"})[0])`,
        hint: "Your menu should work for other button presses too: 'left' from program 1 wraps around to 4." },
      { expr: py`callf('show_menu', 7)[1] == ['=== Program 7 ==='] and len(callf('run_program', 2)[1]) == 2`,
        hint: "show_menu(num) should print '=== Program num ===', and run_program(num) should print the launching line and the complete line." },
    ],
  },
  ch12_s1: {
    output: [
      { expr: py`nums([0, 15, 32, 48, 65, 78, 91, 0, -10, -22, -38, -46])`, hint: "Print each gyro reading until the turn reaches its target, for both turns." },
      { expr: py`not re.search(r'(?<![-\d])95\b', out) and not re.search(r'-50\b', out)`,
        hint: "Stop as soon as a reading reaches or passes the target, so the readings after it are never printed." },
    ],
    probes: [
      { expr: py`callf('gyro_turn', 90, [0, 15, 32, 48, 65, 78, 91, 95])[0] == 91 and callf('gyro_turn', -45, [0, -10, -22, -38, -46, -50])[0] == -46`,
        hint: "gyro_turn should return the reading where it stopped, for positive and for negative targets." },
      { expr: py`(lambda r: r[0] == 40 and not any(re.search(r'\b50\b', l) for l in r[1]))(callf('gyro_turn', 30, [0, 10, 40, 50]))`,
        hint: "gyro_turn should stop at the first reading that reaches the target, for any target and any readings." },
    ],
  },
  ch12_s2: {
    output: [{ expr: py`(has('2:16') or has('136')) and (has('0:14') or bool(re.search(r'\b14\b', out)))`,
      hint: "At the end, print the total time used and the time remaining." }],
    probes: [
      { expr: py`[val('format_time(%d)' % s) for s in (150, 65, 5, 0)] == ['2:30', '1:05', '0:05', '0:00']`,
        hint: "format_time(seconds) should return minutes:seconds with 2 digits for the seconds, like '1:05'." },
      { expr: py`val('can_fit_run(100, 28)') is True and val('can_fit_run(30, 28)') is False and val('can_fit_run(33, 28, buffer=0)') is True`,
        hint: "can_fit_run should return True only when the run plus the buffer (5 seconds unless you give another) fits in time_left." },
      // polarity() plus more "doesn't fit" words: polarity's \bn't\b can't match inside a word, so it missed
      // "doesn't" and "can't" (ALT_doesnt_fit), and polarity keeps "fits: False" (ALT_bool_status). From the
      // first "doesn't fit" line on (run 2 is the last run, so the summary follows), the output must show
      // 0:50 left and 1:40 used. A bare 50 counts only when no digit, ':', '.' or '-' comes before it: the
      // prototype's "50 anywhere" was met by the "-1:50" that format_time(-10) gives after taking away a run
      // that didn't fit (subtract_anyway, split_totals). The 1:40 check can't stand in for that, since a "not"
      // on an earlier line starts the window at run 1's "1:40" (header_neg_word). Reading from that line rather
      // than the last 2 lines lets extra summary lines such as "Runs skipped: 1" pass (ALT_run_counts).
      { expr: py`(lambda t: (lambda k: k is not None and (has('0:50', L=t[k:]) or bool(re.search(r'(?<![\d:.-])50(?!\d)', '\n'.join(t[k:])))) and (has('1:40', L=t[k:]) or has('100', L=t[k:])))(next((i for i, l in enumerate(t) if polarity(l) == -1 or re.search(r"(?i)\b(cannot|can[’']t|won[’']t|doesn[’']t|isn[’']t|skip\w*)\b|too long", l)), None)))(rerun({'run_times': '[100, 60]'})[0])`,
        hint: "When a run doesn't fit, print that it doesn't fit, and don't take its time away." },
    ],
  },
  ch12_s3: {
    output: [
      { expr: py`nums([80, 12.4, 46.2])`, hint: "Print the white average, the black average and the threshold halfway between them." },
      { expr: py`subseq([r're:(?i).*\b20\b.*black.*', r're:(?i).*\b45\b.*black.*', r're:(?i).*\b8\b.*black.*', r're:(?i).*\b60\b.*white.*'])`,
        hint: "Test each reading against your threshold and print whether it is black or white." },
    ],
    probes: [
      { expr: py`val('average([1, 2, 3])') == 2 and val('calibrate([10, 10], [0, 0])') == 5`,
        hint: "average should return the mean of the list, and calibrate should return the midpoint between the white and black averages." },
      { expr: py`subseq([r're:(?i).*\b20\b.*black.*', r're:(?i).*\b45\b.*white.*', r're:(?i).*\b8\b.*black.*', r're:(?i).*\b60\b.*white.*'], L=rerun({'white_samples': '[60, 60]', 'black_samples': '[20, 20]'})[0])`,
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
      { expr: py`sig('right_arm') == (2, 1) and sig('left_arm') == (2, 1)`, hint: "Give right_arm and left_arm a speed parameter that defaults to 600." },
      { expr: py`(lambda t: len(t) >= 4 and not re.search(r'\b14\b', '\n'.join(t)) and re.search(r'(?i)aligned|squared', '\n'.join(t)))(callf('square_on_line', ns['approach'], ns['align'])[1])`,
        hint: "square_on_line should print both phases, and stop phase 2 as soon as both sensors are below BLACK_LINE." },
      // The prototype stood in for "3+ moves" with 8+ printed lines, which a one-line launch() and end_run()
      // miss (ALT_own_messages). Run1 must print at least 4 lines (3 moves and an arm move) more than launch,
      // apply_speed and end_run do. apply_speed's own lines are counted, since the task doesn't say it prints
      // (ALT_silent_speed). The task names apply_speed, so the call is checked too.
      { expr: py`(lambda r, a, s, b: (lambda cs: cs[:1] == ['launch'] and cs[-1:] == ['end_run'] and 'apply_speed' in cs and any(c in ('right_arm', 'left_arm') for c in cs))([c for c, p in r[2] if p == 'Run1']) and len(r[1]) >= len(a) + len(s) + len(b) + 4)(callt('Run1()'), callf('launch')[1], callf('apply_speed', ns['SPEED_FAST'])[1], callf('end_run')[1])`,
        hint: "Run1 should call launch() first, then apply_speed, at least 3 moves and one arm move, and end_run() last." },
      { expr: py`(lambda cs: cs[:1] == ['launch'] and 'square_on_line' in cs and cs[-1:] == ['end_run'])([c for c, p in callt('Run2()')[2] if p == 'Run2'])`,
        hint: "Run2 should call launch(), then square_on_line with the test data, and end_run() last." },
      { expr: py`'Run2' not in trace`, hint: "With these buttons the menu never reaches Run2: center runs Run1 and moves to 2, then right moves to 3." },
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
  grind_21: {
    output: [{ expr: py`nums_approx([0.67, 1.33, 0.75, 2.75])`, hint: "Print each segment's time (distance / speed), then the total time." }],
    probes: [{ expr: py`nums_approx([2.0, 2.0], L=rerun({'segments': "[{'dist': 100, 'speed': 50}]"})[0])`,
      hint: "Work each time out from the segment's dist and speed, so the answers change when the segments do." }],
  },
  // Within 0.051 instead of exact, so an average rounded to one decimal (42.9) counts (ALT_loop_round).
  grind_22: {
    output: [{ expr: py`nums_approx([10, 80, 42.85, 6, 10], tol=0.051)`,
      hint: "Print the minimum, the maximum, the average, how many readings are below 22, and the index of the first one, in that order." }],
    probes: [{ expr: py`nums_approx([10, 50, 27.5, 2, 1], tol=0.051, L=rerun({'readings': '[50, 20, 30, 10]'})[0])`,
      hint: "Work everything out from the readings list, so the answers change when the readings do." }],
  },
  // content bug: all 4 runs fit in 150 s (136 s in total), so the time limit never matters with the task's data.
  // The rule accepts all 4 runs, and the MATCH_TIME = 75 rerun tests the limit (greedy and best agree there: 280).
  grind_23: {
    output: [
      { expr: py`re.findall(r'\bRun[1-4]\b', out)[-4:] == ['Run1', 'Run3', 'Run4', 'Run2']`,
        hint: "Sort the runs by points per second (points / time), best first, and print them in that order." },
      { expr: py`has('455')`, hint: "Print the total points of the runs that fit in the match time." },
    ],
    probes: [{ expr: py`has('280', L=rerun({'MATCH_TIME': '75'})[0])`,
      hint: "Only add a run if it still fits in MATCH_TIME, so a shorter match picks fewer runs." }],
  },
};
