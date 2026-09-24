# Proposed run-and-check rules, chapters 9-12 (+ grind_16..23).
from rules_core import E

def ROB(sim, real, mock):
    return {"importsPybricks": False, "simulatedWith": sim, "realPybricksEquivalent": real, "mockMustSupport": mock}

WORDS = "re.findall(r'(?i)\\b(black|white)\\b', out)"

E("ch9_r1", "deterministic", "pattern", "Round 1..4 then Game Over!, never Round 5; rerun responses=['y','n']; while True + break",
  out=[("Round 1..4 in order, then Game Over! last", "subseq([r're:.*Round 1!', r're:.*Round 2!', r're:.*Round 3!', r're:.*Round 4!', 'Game Over!']) and L[-1] == 'Game Over!' and not has('Round 5')")],
  probes=[("rerun responses=['y','n'] stops after Round 2", "(lambda t: subseq([r're:.*Round 1!', r're:.*Round 2!', 'Game Over!'], L=t) and not has('Round 3', L=t))(rerun({'responses': \"['y', 'n']\"})[0])")],
  ast=[("while True loop", "any(isinstance(n, ast.While) and isinstance(n.test, ast.Constant) and n.test.value is True for n in ast.walk(TREE))", "expectedBehavior"),
       ("uses break", "count(ast.Break) >= 1", "task")],
  loop=("high", "Forgetting 'i += 1' re-reads 'y' forever and floods output (measured: 8.5M lines / 185 MB in 2 s, CPython). A wrong break test ('no' vs 'n') ends in IndexError instead (measured)."),
  notes="Task says the game 'Asks \"Continue? (y/n): \"'; kids who call input() get EOFError today. With Pyodide, setStdin can feed the responses list as stdin so input() works (measured: prompt is written to stdout, the answer is not echoed). Emoji in 'Round' lines: normalise by stripping U+FE0F and allow a missing emoji.")

E("ch9_r2", "random-unseeded", "property", "10 Heads/Tails flips, tally matches the flips; patched choice forces all Tails",
  out=[("10 flip lines", "len([l for l in L if re.search(r'\\b(Heads|Tails)\\b', l) and not (('Heads' in l) and ('Tails' in l))]) == 10"),
       ("tally equals the flips", "(lambda f: numset([sum('Heads' in l for l in f), sum('Tails' in l for l in f)], L=L[-2:]))([l for l in L if re.search(r'\\b(Heads|Tails)\\b', l) and not (('Heads' in l) and ('Tails' in l))])")],
  probes=[("flip_coin() takes no parameters and returns Heads/Tails", "sig('flip_coin') == (0, 0) and {callf('flip_coin')[0] for _ in range(200)} == {'Heads', 'Tails'}"),
          ("choice patched to Tails: tally shows 0 and 10", "numset([0, 10], L=rerun(patches={'random.choice': lambda s: 'Tails'})[0][-2:])")],
  randomness="unseeded: invariants + patched random.choice")

E("ch9_r3", "random-unseeded", "property", "5 rounds with rolls and winners; counters correct under scripted rolls (order-independent script)",
  out=[("5 rounds reported", "len([l for l in L if len(ints(l)) >= 2]) >= 5"),
       ("counters add to 5 and are printed", "ns.get('player_wins', 0) + ns.get('enemy_wins', 0) + ns.get('ties', 0) == 5 and numset([ns['player_wins'], ns['enemy_wins'], ns['ties']], L=L[-3:])")],
  probes=[("scripted rolls (P,E,T,P,E) give 2/2/1 whichever die is rolled first", "(lambda r: (r.ns.get('player_wins'), r.ns.get('enemy_wins'), r.ns.get('ties')) == (2, 2, 1))(rerun(patches={'random.randint': seq([6, 1, 1, 6, 3, 3, 5, 2, 2, 5])})[1])"),
          ("all rolls 4: 5 ties", "rerun(patches={'random.randint': lambda a, b: 4})[1].ns.get('ties') == 5"),
          ("rolls 6,1 repeating: one side wins all 5", "(lambda r: sorted([r.ns.get('player_wins'), r.ns.get('enemy_wins')]) == [0, 5] and r.ns.get('ties') == 0)(rerun(patches={'random.randint': seq([6, 1])})[1])")],
  randomness="unseeded: patched randint script chosen so the result does not depend on whether player or enemy rolls first")

E("ch9_r4", "deterministic", "exact", "the 7 exact status lines in order; validate_guess returns only valid guesses",
  out=[("7 status lines in order", "subseq(['Guess 5 accepted!', '15 is out of range! Must be 1-10.', '0 is out of range! Must be 1-10.', 'Guess 8 accepted!', 'Guess 3 accepted!', '-1 is out of range! Must be 1-10.', 'Guess 10 accepted!'])")],
  probes=[("validate_guess([1, 11, 10, 0]) returns [1, 10] and prints 4 lines", "callf('validate_guess', [1, 11, 10, 0])[0] == [1, 10] and len(callf('validate_guess', [1, 11, 10, 0])[1]) == 4")])

E("ch9_r5", "random-seeded", "property", "5 rounds and a final score; scripted increasing cards give 3/5, decreasing give 2/5 (either drawing style); seed(42) called",
  out=[("5 rounds and a final score line", "len(L) >= 6 and len(ints(L[-1])) >= 1")],
  probes=[("increasing cards 1,2,3...: final score 3", "nums([3], L=rerun(patches={'random.randint': seq(list(range(1, 14)))})[0][-1:])"),
          ("decreasing cards 13,12,11...: final score 2", "nums([2], L=rerun(patches={'random.randint': seq(list(range(13, 0, -1)))})[0][-1:])"),
          ("draw_card() returns ints 1-13", "all(isinstance(v, int) and 1 <= v <= 13 for v in [callf('draw_card')[0] for _ in range(100)])"),
          ("random.seed(42) is called", "(lambda w: (rerun(patches={'random.seed': w[0]}), (42,) in w[1])[1])(rec('random.seed'))")],
  randomness="seeded(42) but exact output depends on how many randint calls the kid makes per round (measured: a 'carry the card over' solution prints different cards than the reference); grade with scripted cards instead")

E("ch9_s1", "deterministic", "exact", "30 '=', DRAGON QUEST centred (8-10 leading spaces), Press ENTER to start, 30 '='; show_title works for another name",
  out=[("4 lines with a centred title", "len(L) == 4 and L[0] == '=' * 30 and L[3] == '=' * 30 and L[1].strip() == 'DRAGON QUEST' and 8 <= len(L[1]) - len(L[1].lstrip()) <= 10 and L[2] == 'Press ENTER to start'")],
  probes=[("show_title('HI') centres HI", "(lambda t: len(t) == 4 and t[1].strip() == 'HI' and 13 <= len(t[1]) - len(t[1].lstrip()) <= 15)(callf('show_title', 'HI')[1])"),
          ("show_title takes 1 parameter", "sig('show_title') == (1, 0)")],
  notes="Centred line has trailing spaces in the reference ('.center(30)'); comparisons must rstrip lines but keep leading spaces.")

E("ch9_s2", "deterministic", "exact", "5 4 3 2 1, BLAST OFF!, launched; countdown(3) works and returns 'launched'",
  out=[("exact lines (emoji optional)", "lines(['5', '4', '3', '2', '1', r're:.*BLAST OFF!', 'launched'])")],
  probes=[("countdown(3) prints 3 2 1 BLAST OFF! and returns launched", "(lambda r: r[0] == 'launched' and r[1][:3] == ['3', '2', '1'] and 'BLAST OFF!' in r[1][3])(callf('countdown', 3))")],
  loop=("high", "A while-loop version that forgets 'n -= 1' floods output forever (measured: 16.5M lines in 2 s, CPython)."))

E("ch9_s3", "deterministic", "exact", "Fight!, Inventory, Fight!, Goodbye! (emoji optional); rerun choices; break on 3",
  out=[("4 lines", "lines([r're:.*Fight!', r're:.*Inventory', r're:.*Fight!', r're:.*Goodbye!'])")],
  probes=[("rerun choices=['2','9','3','1'] gives Inventory, Unknown choice, Goodbye! and stops", "lines([r're:.*Inventory', r're:(?i).*unknown choice.*', r're:.*Goodbye!'], L=rerun({'choices': \"['2', '9', '3', '1']\"})[0])")],
  ast=[("uses break", "count(ast.Break) >= 1", "task")])

E("ch9_boss", "random-seeded", "property", "get_winner correct for all 9 pairs; scripted computer moves give 2-2; seed(42) called",
  out=[("5 round results", "len([l for l in L if re.search(r'(?i)\\b(win|wins|won|tie|draw)\\b', l)]) >= 5")],
  probes=[("get_winner correct for all 9 pairs", "all(val('get_winner(%r, %r)' % (p, c)) == w for p, c, w in [('rock','rock','tie'), ('rock','paper','computer'), ('rock','scissors','player'), ('paper','rock','player'), ('paper','paper','tie'), ('paper','scissors','computer'), ('scissors','rock','computer'), ('scissors','paper','player'), ('scissors','scissors','tie')])"),
          ("computer moves scissors,rock,rock,rock,scissors: final score 2-2", "(lambda t: numset([2], L=t[-2:]) and not numset([3], L=t[-2:]))(rerun(patches={'random.choice': seq(['scissors', 'rock', 'rock', 'rock', 'scissors'])})[0])"),
          ("random.seed(42) is called", "(lambda w: (rerun(patches={'random.seed': w[0]}), (42,) in w[1])[1])(rec('random.seed'))")],
  randomness="seeded(42); one random.choice per round so exact output is reproducible (measured identical in CPython 3.13 and Pyodide 3.14), but only if the kid lists the moves in the same order; scripted choice is safer")

E("grind_16", "random-seeded", "property", "each question followed by a response from the list; with choice patched to 'Maybe' every answer is Maybe",
  out=[("3 questions in order", "has('Will I win?', 'Is it sunny?', 'Should I go?')")],
  probes=[("responses and questions lists as given", "ns.get('responses') == ['Yes!', 'No!', 'Maybe', 'Ask again'] and ns.get('questions') == ['Will I win?', 'Is it sunny?', 'Should I go?']"),
          ("choice patched to Maybe: Q, Maybe, Q, Maybe, Q, Maybe", "has('Will I win?', 'Maybe', 'Is it sunny?', 'Maybe', 'Should I go?', 'Maybe', L=rerun(patches={'random.choice': lambda s: 'Maybe'})[0])"),
          ("random.seed(42) is called", "(lambda w: (rerun(patches={'random.seed': w[0]}), (42,) in w[1])[1])(rec('random.seed'))")],
  randomness="seeded(42); natural solutions make one choice per question so seeded output is stable, but patching is simpler to explain in feedback")

E("grind_17", "random-seeded", "property", "seed 42 makes the secret 4, so 5 x 'Too high' (never Correct!); patched secrets test the other branches and the stop",
  out=[("5 'Too high' lines", "len(L) == 5 and all(re.search(r'(?i)too high', l) for l in L)")],
  probes=[("secret 12: Too low, Too low, Too high, Correct! then stop", "[m.group().lower() for m in (re.search(r'(?i)too high|too low|correct', l) for l in rerun(patches={'random.randint': lambda a, b: 12})[0]) if m] == ['too low', 'too low', 'too high', 'correct']"),
          ("secret 10: Correct! on the first guess and nothing after", "len(rerun(patches={'random.randint': lambda a, b: 10})[0]) == 1")],
  randomness="seeded(42): measured randint(1, 20) == 4, below every simulated guess",
  notes="Content issue: with seed 42 the secret is 4 and guesses are [10, 5, 15, 12, 8], so 'Correct!' and the break can never run; a kid with a broken break passes any output-only rule. Patched secrets fix the grading.")

E("ch10_r1", "free-choice", "values-from-variables", "4 functions with the right contracts; all called by the main run; questions shown and a score/percentage printed",
  out=[("every question from setup_quiz() is printed", "isinstance(val('setup_quiz()'), list) and all(d['q'] in out for d in val('setup_quiz()'))")],
  probes=[("setup_quiz() returns 3 dicts with q and a", "(lambda qs: isinstance(qs, list) and len(qs) == 3 and all(isinstance(d, dict) and {'q', 'a'} <= set(d) for d in qs))(val('setup_quiz()'))"),
          ("ask_question prints the question and returns its answer", "(lambda r: r[0] == 'Yan' and any('Zed?' in l for l in r[1]))(callf('ask_question', {'q': 'Zed?', 'a': 'Yan'}))"),
          ("run_quiz(2 questions) returns 2", "callf('run_quiz', [{'q': 'Q1', 'a': '1'}, {'q': 'Q2', 'a': '2'}])[0] == 2"),
          ("show_results(1, 4) prints 1, 4 and 25", "numset([1, 4, 25], L=callf('show_results', 1, 4)[1])"),
          ("main run calls all four", "all(f in trace for f in ('setup_quiz', 'ask_question', 'run_quiz', 'show_results'))")],
  notes="The spec makes ask_question return the correct answer, so every quiz scores 100%; the probes test the contracts, not a real quiz.")

E("ch10_r2", "free-choice", "values-from-variables", "3 questions with numbered choices; per-question result; final score equals the number of simulated answers that match",
  out=[("final line shows the expected score out of 3", "isinstance(ns.get('questions'), list) and len(ns['questions']) == 3 and nums([sum(a == q['answer'] for a, q in zip(ns['simulated_answers'], ns['questions'])), 3], L=L[-1:])")],
  probes=[("questions are dicts with q, choices (list) and answer (int index)", "all(isinstance(q, dict) and isinstance(q.get('choices'), list) and type(q.get('answer')) is int and 'q' in q for q in ns.get('questions', [0]))"),
          ("display_question(q, 7) prints the question, 7 and every choice", "(lambda t: 'Zed?' in t and '7' in t and all(c in t for c in ['Ann', 'Bo', 'Cy']))('\\n'.join(callf('display_question', {'q': 'Zed?', 'choices': ['Ann', 'Bo', 'Cy'], 'answer': 2}, 7)[1]))"),
          ("check_answer True for the right index, False otherwise", "callf('check_answer', {'q': 'Z', 'choices': ['a', 'b', 'c'], 'answer': 2}, 2)[0] is True and callf('check_answer', {'q': 'Z', 'choices': ['a', 'b', 'c'], 'answer': 2}, 0)[0] is False")])

E("ch10_r3", "deterministic", "values-fixed-wording-free", "first show: potion 3, sword 1, arrow 2; second: potion 2, sword 1, no arrow; functions stack/remove/delete/Empty!",
  out=[("potion 3 then potion 2", "[ints(l)[-1:] for l in L if 'potion' in l.lower()] == [[3], [2]]"),
       ("arrow shown once with 2; sword twice with 1", "[ints(l)[-1:] for l in L if 'arrow' in l.lower()] == [[2]] and [ints(l)[-1:] for l in L if 'sword' in l.lower()] == [[1], [1]]")],
  probes=[("inventory ends as {'potion': 2, 'sword': 1}", "ns.get('inventory') == {'potion': 2, 'sword': 1}"),
          ("add_item stacks and defaults qty to 1", "(lambda d: (callf('add_item', d, 'x'), callf('add_item', d, 'x', 2), d == {'x': 3})[2])({})"),
          ("remove_item deletes at 0", "(lambda d: (callf('remove_item', d, 'x', 2), d == {})[1])({'x': 2})"),
          ("show_inventory({}) prints Empty!", "any('Empty!' in l for l in callf('show_inventory', {})[1])")])

E("ch10_r4", "free-choice", "free-text", "story follows left -> fight: scene_start and scene_left run, scene_right does not; reruns take the other paths",
  out=[("some story text", "len(L) >= 3")],
  probes=[("main run calls scene_start then scene_left, never scene_right", "'scene_start' in trace and 'scene_left' in trace and 'scene_right' not in trace and trace.index('scene_start') < trace.index('scene_left')"),
          ("rerun choices=['right'] goes to scene_right and prints 'treasure found!'", "(lambda r: 'scene_right' in r[1].trace and 'scene_left' not in r[1].trace and any('treasure found!' in l for l in r[0]))(rerun({'choices': \"['right']\"}))"),
          ("rerun choices=['left','sneak'] ends differently from fight", "rerun({'choices': \"['left', 'sneak']\"})[0] != L")],
  notes="Narrative text is free. The CODEX 'Choice trees' example uses input(); if input() is allowed, feed choices on stdin.")

E("ch10_r5", "deterministic", "values-fixed-wording-free", "damage lines show 70 and 45, loot line shows Iron Sword and 50, status shows 45/15/Iron Sword/50; state dict correct",
  out=[("hp 70, loot, hp 45, then status", "nums([70, 50, 45]) and has('Iron Sword') and numset([45, 15, 50], L=L[3:])")],
  probes=[("player final state", "ns.get('player') == {'name': 'Hero', 'hp': 45, 'attack': 15, 'inventory': ['Iron Sword'], 'gold': 50}"),
          ("take_damage returns alive True/False", "callf('take_damage', {'name': 'Z', 'hp': 10, 'attack': 1, 'inventory': [], 'gold': 0}, 3)[0] is True and callf('take_damage', {'name': 'Z', 'hp': 10, 'attack': 1, 'inventory': [], 'gold': 0}, 30)[0] is False")])

E("ch10_s1", "random-seeded", "property", "10 drops of table items; summary counts match the drops; get_drop frequencies about 60/30/10 over 2000 draws",
  out=[("10 drop lines and matching per-rarity counts",
        "(lambda R: (lambda drops, rest: len(drops) >= 10 and all(any(re.search(r'(?i)\\b%s\\b\\D*\\b%d\\b' % (r, sum(R[[n for n in R if n in d][0]] == r for d in drops[:10])), s) for s in rest) for r in ('common', 'rare', 'legendary')))([l for l in L if any(n in l for n in R)], [l for l in L if not any(n in l for n in R)]))({'Gold Coin': 'common', 'Health Potion': 'common', 'Magic Ring': 'rare', 'Dragon Scale': 'legendary'})")],
  probes=[("get_drop returns a table item", "all(callf('get_drop', ns['loot_table'])[0] in ns['loot_table'] for _ in range(50))"),
          ("rarity frequencies ~60/30/10 over 2000 draws", "(lambda rs: abs(rs.count('common') / 2000 - 0.6) < 0.05 and abs(rs.count('rare') / 2000 - 0.3) < 0.05 and abs(rs.count('legendary') / 2000 - 0.1) < 0.04)([callf('get_drop', ns['loot_table'])[0]['rarity'] for _ in range(2000)])")],
  randomness="seeded(42) but measured: a solution that returns fixed items per rarity (no random.choice) prints a different drop list from the reference; grade by statistics and self-consistency",
  notes="Which end of 1-100 maps to 'legendary' is not specified; the frequency probe accepts any mapping.")

E("ch10_s2", "random-seeded", "property", "5 enemy lines with a listed name, hp 61-70, attack 10-14; generate_enemy scales with level",
  out=[("5 lines naming a listed enemy", "len([l for l in L if any(n in l for n in ('Goblin', 'Skeleton', 'Troll', 'Ghost'))]) == 5"),
       ("5 hp values 61-70 and 5 attack values 10-14", "sum(61 <= v <= 70 for v in ints(out)) >= 5 and sum(10 <= v <= 14 for v in ints(out)) >= 5")],
  probes=[("generate_enemy(3): name listed, hp 61-70, attack 10-14", "all((lambda e: e['name'] in ns['names'] and 61 <= e['hp'] <= 70 and 10 <= e['attack'] <= 14)(callf('generate_enemy', 3)[0]) for _ in range(200))"),
          ("generate_enemy(1): hp 21-30, attack 4-8, names vary", "(lambda es: all(21 <= e['hp'] <= 30 and 4 <= e['attack'] <= 8 for e in es) and len({e['name'] for e in es}) >= 2)([callf('generate_enemy', 1)[0] for _ in range(200)])")],
  randomness="seeded(42) but measured: computing hp/attack before choosing the name (same logic) prints different enemies; grade by ranges")

E("ch10_s3", "deterministic", "values-fixed-wording-free", "leaderboard 1. Bob 1200, 2. Eve 1100, 3. Dave 950; no Alice/Carol; add_score sorts; show_top default n=3",
  out=[("top 3 in order", "subseq([r're:.*Bob.*1200.*', r're:.*Eve.*1100.*', r're:.*Dave.*950.*']) and 'Alice' not in out and 'Carol' not in out")],
  probes=[("scores list sorted high to low", "[d.get('score') for d in ns.get('scores', [])] == [1200, 1100, 950, 850, 650]"),
          ("add_score appends and sorts", "(lambda t: (callf('add_score', t, 'Z', 5), callf('add_score', t, 'Y', 9), [d['score'] for d in t] == [9, 5])[2])([])"),
          ("show_top default is 3 and n works", "sig('show_top') == (2, 1) and (lambda t: len([l for l in callf('show_top', t, 1)[1] if 'A1' in l or 'B2' in l]) == 1)([{'name': 'A1', 'score': 2}, {'name': 'B2', 'score': 1}])")])

E("ch10_boss", "free-choice", "values-from-variables", "the three room descriptions appear in playthrough order; player ends two rooms north holding sword; look/move/pickup behave",
  out=[("start, north room and final room descriptions in order", "(lambda R: (lambda a, b: has(R['start']['desc'], R[a]['desc'], R[b]['desc']))(R['start']['exits']['north'], R[R['start']['exits']['north']]['exits']['north']))(ns['rooms'])")],
  probes=[("rooms: 3+ rooms with desc and exits", "isinstance(ns.get('rooms'), dict) and len(ns['rooms']) >= 3 and all({'desc', 'exits'} <= set(r) for r in ns['rooms'].values())"),
          ("player ends two rooms north with the sword", "'sword' in ns['player']['inventory'] and ns['player']['location'] == ns['rooms'][ns['rooms']['start']['exits']['north']]['exits']['north']"),
          ("move ignores a missing exit", "(lambda p: (callf('move', ns['rooms'], p, 'nowhere'), p['location'] == 'start')[1])({'location': 'start', 'inventory': [], 'hp': 50})"),
          ("pickup adds to inventory", "(lambda p: (callf('pickup', p, 'rope'), 'rope' in p['inventory'])[1])({'location': 'start', 'inventory': [], 'hp': 50})")],
  notes="Room names beyond 'start' and the exit names are the kid's; rules follow the kid's own map.")

E("grind_18", "deterministic", "values-fixed-wording-free", "balances 50, 40, 10 in order; buy returns remaining gold or -1",
  out=[("balances 50, 40, 10", "nums([50, 40, 10])")],
  probes=[("buy cases", "val(\"buy(items, 'Sword', 40)\") == -1 and val(\"buy(items, 'Potion', 10)\") == 0 and val(\"buy(items, 'Shield', 100)\") == 70")])

E("grind_19", "deterministic", "values-fixed-wording-free", "HP sequence 60, 85, 40, 70, 20, 55, 0 and Hero wins; rerun where the Hero loses",
  out=[("HP sequence in order", "nums([60, 85, 40, 70, 20, 55, 0])"),
       ("last line says the Hero won / the Dragon lost", "bool(re.search(r'(?i)\\bhero\\b\\W*(wins|won|is the winner|is victorious)', L[-1]) or re.search(r'(?i)\\bdragon\\b\\W*(is\\W+)?(defeated|loses|lost|dies|died|fell|falls|beaten)', L[-1]))")],
  probes=[("rerun player hp 20, attack 5: last line says the Dragon won / the Hero lost", "(lambda s: bool(re.search(r'(?i)\\bdragon\\b\\W*(wins|won|is the winner|is victorious)', s) or re.search(r'(?i)\\bhero\\b\\W*(is\\W+)?(defeated|loses|lost|dies|died|fell|falls|beaten)', s)))(rerun({'player': \"{'name': 'Hero', 'hp': 20, 'attack': 5}\"})[0][-1])")],
  loop=("high", "while hp > 0 with the subtraction printed but not stored never ends (measured: 9.9M lines / 277 MB in 2 s, CPython)."),
  notes="Kids may clamp HP at 0 or show negatives; the rerun only looks at who wins. Winner wording is free, so the check looks for '<name> wins' or '<name> is defeated'.")

E("ch11_r1", "deterministic", "values-fixed-wording-free", "all settings printed (PrimeHub, Z, Y, D counterclockwise, C clockwise, 62.4, 80); dicts exact; drive_base references the motor dicts",
  out=[("every setting appears", "all(re.search(p, out) for p in [r'PrimeHub', r'\\bZ\\b', r'\\bY\\b', r'\\bD\\b', r'counterclockwise', r'\\bC\\b', r'(?<!counter)clockwise', r'62\\.4', r'(?<!\\d)80(?!\\d)'])")],
  probes=[("hub, motor and drive_base dicts", "ns.get('hub') == {'name': 'PrimeHub', 'top_side': 'Z', 'front_side': 'Y'} and ns.get('left_motor') == {'port': 'D', 'direction': 'counterclockwise'} and ns.get('right_motor') == {'port': 'C', 'direction': 'clockwise'} and ns.get('drive_base', {}).get('wheel_diameter') == 62.4 and ns['drive_base'].get('axle_track') == 80"),
          ("drive_base holds the motor dicts themselves", "ns['drive_base'].get('left') is ns['left_motor'] and ns['drive_base'].get('right') is ns['right_motor']")],
  robotics=ROB("dicts + print", ["PrimeHub(top_side=Axis.Z, front_side=Axis.Y)", "Motor(Port.D, Direction.COUNTERCLOCKWISE)", "Motor(Port.C, Direction.CLOCKWISE)", "DriveBase(left_motor, right_motor, wheel_diameter=62.4, axle_track=80)"],
               ["pybricks.hubs.PrimeHub, pybricks.pupdevices.Motor, pybricks.robotics.DriveBase constructors that record their arguments", "Port, Direction, Axis enums", "a way for the grader to read back port/direction/wheel settings (real objects do not expose them for printing, so 'print each component's port' would become a mock-only feature)"]),
  notes="Task says 'using classes and dicts' but only dicts are used.")

E("ch11_r2", "deterministic", "pattern", "Driving 200mm forward, Turning 90° right, Driving 150mm forward, Turning 45° left, Driving 100mm backward, total 450",
  out=[("5 moves in order (° optional, sign optional)", "subseq([r're:Driving 200 ?mm forward', r're:Turning 90 ?(°|deg\\w*)? ?right', r're:Driving 150 ?mm forward', r're:Turning -?45 ?(°|deg\\w*)? ?left', r're:Driving -?100 ?mm backward'])"),
       ("total 450 last", "nums([450], L=L[-1:])")],
  probes=[("robot_straight(-30) says backward", "any(re.fullmatch(r'Driving -?30 ?mm backward', l) for l in callf('robot_straight', -30)[1])"),
          ("robot_turn(-10) says left", "any(re.fullmatch(r'Turning -?10 ?(°|deg\\w*)? ?left', l) for l in callf('robot_turn', -10)[1])"),
          ("total_distance == 450", "ns.get('total_distance') == 450")],
  robotics=ROB("print", ["drive_base.straight(200)", "drive_base.turn(90)", "drive_base.straight(-100)"], ["DriveBase.straight(distance, then=Stop.HOLD, wait=True)", "DriveBase.turn(angle, then=Stop.HOLD, wait=True)", "a command log (and simulated pose) the grader can compare instead of printed text", "DriveBase.distance()/angle() if kids read back totals"]),
  notes="The ° sign is hard to type; accept '90 deg'/'90 degrees'/'90'. Sign convention (right = positive) comes from the reference, not the task.")

E("ch11_r3", "deterministic", "exact", "4 arm lines with the right degrees and speeds, then 4; defaults of 600",
  out=[("4 arm moves in order", "subseq([r're:Right arm: -240 ?(°|deg\\w*)? at speed 600', r're:Left arm: 110 ?(°|deg\\w*)? at speed 250', r're:Left arm: 40 ?(°|deg\\w*)? at speed 100', r're:Right arm: 195 ?(°|deg\\w*)? at speed 800'])"),
       ("count 4 last", "nums([4], L=L[-1:])")],
  probes=[("right_arm/left_arm take (degrees, speed=600)", "sig('right_arm') == (2, 1) and sig('left_arm') == (2, 1)"),
          ("right_arm(10) uses speed 600; left_arm(5, speed=7) uses 7", "numset([10, 600], L=callf('right_arm', 10)[1]) and numset([5, 7], L=callf('left_arm', 5, speed=7)[1])"),
          ("movements == 4", "ns.get('movements') == 4")],
  robotics=ROB("print", ["right_motor.run_angle(600, -240, Stop.HOLD)", "left_motor.run_angle(250, 110)"], ["Motor.run_angle(speed, rotation_angle, then=Stop.HOLD, wait=True)", "Stop enum (COAST, BRAKE, HOLD, NONE, COAST_SMART)", "per-motor command log with speed and angle"]))

E("ch11_r4", "deterministic", "values-fixed-wording-free", "speeds then moves in order: 600/350 500, 400/250 45, 250/150 110, 150/100 90; drive_segment calls apply_speed first",
  out=[("speed + move sequence", "nums_abs([600, 350, 500, 400, 250, 45, 250, 150, 110, 150, 100, 90])")],
  probes=[("4 profile dicts", "(ns.get('SPEED_NORMAL'), ns.get('SPEED_FAST'), ns.get('SPEED_SLOW'), ns.get('SPEED_PUSHING')) == ({'straight': 400, 'turn': 250}, {'straight': 600, 'turn': 350}, {'straight': 150, 'turn': 100}, {'straight': 250, 'turn': 150})"),
          ("apply_speed prints both speeds", "numset([111, 222], L=callf('apply_speed', {'straight': 111, 'turn': 222})[1])"),
          ("drive_segment applies speed before moving", "nums([111, 222, 333, 444], L=callf('drive_segment', 333, 444, {'straight': 111, 'turn': 222})[1]) and called_from('apply_speed', 'drive_segment')")],
  robotics=ROB("print + dicts", ["drive_base.settings(straight_speed=600, turn_rate=350)", "drive_base.straight(500)", "drive_base.turn(45)"], ["DriveBase.settings(straight_speed, straight_acceleration, turn_rate, turn_acceleration)", "record current settings with each straight/turn in the log"]))

E("ch11_r5", "deterministic", "values-fixed-wording-free", "launch output (gyro, arms, Ready!) first; moves 690, 45 right, 130, 90 left, 90, arm -240; Run complete! last; Run1 calls launch first and end_run last",
  out=[("Ready! before the moves, Run complete! last", "has('Ready!') and L[-1].endswith('Run complete!') and nums_abs([690, 45, 130, 90, 90, 240])")],
  probes=[("Run1 was called", "'Run1' in trace"),
          ("Run1 calls launch first and end_run last", "callees('Run1')[:1] == ['launch'] and callees('Run1')[-1:] == ['end_run']"),
          ("launch() mentions gyro and arms and Ready!", "(lambda t: 'gyro' in t.lower() and 'arm' in t.lower() and 'Ready!' in t)('\\n'.join(callf('launch')[1]))")],
  robotics=ROB("print", ["hub.imu.reset_heading(0)", "motor.reset_angle(0)", "hub.light.on(Color.YELLOW)", "drive_base.straight(690)", "drive_base.stop()", "hub.light.on(Color.GREEN)"], ["hub.imu.reset_heading(angle)", "Motor.reset_angle(angle=None)", "hub.light.on(color) + Color enum", "DriveBase.stop()"]))

E("ch11_s1", "deterministic", "values-fixed-wording-free", "550, 140, 35.0, 152 in a table; converters right on other inputs",
  out=[("4 conversions in order", "nums([550, 140, 35, 152]) and len(L) >= 4")],
  probes=[("cm_to_mm(2) == 20, inches_to_mm(1) == 25, inches_to_mm(2) == 51", "val('cm_to_mm(2)') == 20 and val('inches_to_mm(1)') == 25 and val('inches_to_mm(2)') == 51")],
  robotics=ROB("pure arithmetic", [], ["nothing (no hardware calls)"]))

E("ch11_s2", "deterministic", "values-fixed-wording-free", "4 log lines (motor, action, value) then total 4; log holds the 4 dicts",
  out=[("4 entries in order", "subseq([r're:.*left_motor.*straight.*\\b400\\b.*', r're:.*right_motor.*straight.*\\b400\\b.*', r're:.*left_arm.*rotate.*-240.*', r're:.*right_arm.*rotate.*\\b195\\b.*'])"),
       ("total 4 last", "nums([4], L=L[-1:])")],
  probes=[("log contents", "ns.get('log') == [{'motor': 'left_motor', 'action': 'straight', 'value': 400}, {'motor': 'right_motor', 'action': 'straight', 'value': 400}, {'motor': 'left_arm', 'action': 'rotate', 'value': -240}, {'motor': 'right_arm', 'action': 'rotate', 'value': 195}]"),
          ("log_command appends one dict", "(lambda l: (callf('log_command', l, 'm', 'a', 1), l == [{'motor': 'm', 'action': 'a', 'value': 1}])[1])([])")],
  robotics=ROB("list of dicts", [], ["this is what a mock's command log would record automatically"]))

E("ch11_s3", "deterministic", "values-fixed-wording-free", "headings 90, 180, 135, 315, 45 then final 45; turn wraps with % 360",
  out=[("headings in order and final 45", "nums([90, 180, 135, 315, 45]) and nums([45], L=L[-1:])")],
  probes=[("turn(350, 20) == 10, turn(10, -30) == 340, turn(0, 720) == 0", "val('turn(350, 20)') == 10 and val('turn(10, -30)') == 340 and val('turn(0, 720)') == 0"),
          ("heading == 45", "ns.get('heading') == 45")],
  ast=[("uses % for wrapping", "binop('Mod') >= 1", "task")],
  robotics=ROB("arithmetic", ["hub.imu.heading()"], ["hub.imu.heading() returning a scripted or simulated heading"]),
  notes="Probes already prove wrapping; the % check is only because the task names it.")

E("ch11_boss", "deterministic", "values-from-variables", "Ready! first; fast speed, 690, 45, 130, 90, 90, arm -240, normal speed, 350 back; Run complete! last; Run1 structure via call trace",
  out=[("mission sequence using the kid's speed values", "nums_abs([ns['SPEED_FAST']['straight'], 690, 45, 130, 90, 90, 240, ns['SPEED_NORMAL']['straight'], 350]) and has('Ready!') and L[-1].endswith('Run complete!')")],
  probes=[("SPEED_FAST and SPEED_NORMAL have straight and turn", "all({'straight', 'turn'} <= set(ns.get(k, {})) for k in ('SPEED_FAST', 'SPEED_NORMAL'))"),
          ("arm helpers default to 600", "sig('right_arm') == (2, 1) and sig('left_arm') == (2, 1) and numset([600], L=callf('left_arm', 5)[1])"),
          ("Run1: launch first, end_run last, apply_speed twice, right_arm used", "callees('Run1')[:1] == ['launch'] and callees('Run1')[-1:] == ['end_run'] and callees('Run1').count('apply_speed') >= 2 and 'right_arm' in callees('Run1')")],
  robotics=ROB("print + dicts", ["drive_base.settings(...)", "drive_base.straight/turn", "right_motor.run_angle(600, -240)", "hub.light.on(...)"], ["everything from ch11_r2..r5"]))

E("ch12_r1", "deterministic", "pattern", "black/white status for left and right of each of the 4 readings; read_sensor threshold correct; rerun readings",
  out=[("statuses in order (black/white or on/off)", "re.findall(r'(?i)\\b(black|white)\\b', out)[-8:] == ['black', 'white', 'white', 'black', 'black', 'black', 'white', 'white'] or re.findall(r'(?i)\\b(on|off)\\b', out)[-8:] == ['on', 'off', 'off', 'on', 'on', 'on', 'off', 'off']")],
  probes=[("read_sensor threshold at 22", "[val('read_sensor(%d)' % v) for v in (0, 21, 22, 90)] == ['black', 'black', 'white', 'white']"),
          ("BLACK_LINE == 22 and check_sensors called 4 times", "ns.get('BLACK_LINE') == 22 and trace.count('check_sensors') == 4"),
          ("rerun readings=[(30, 5)] gives white, black", "(lambda t: re.findall(r'(?i)\\b(black|white)\\b', t)[-2:] == ['white', 'black'] or re.findall(r'(?i)\\b(on|off)\\b', t)[-2:] == ['off', 'on'])('\\n'.join(rerun({'readings': '[(30, 5)]'})[0]))")],
  robotics=ROB("numbers in a list", ["left_color = ColorSensor(Port.A); left_color.reflection()"], ["ColorSensor(port).reflection() returning scripted values per sensor, per call"]))

E("ch12_r2", "deterministic", "pattern", "Driving lines for 80, 75, 60, 55, 40; LINE DETECTED at 18; never processes 10; tick count 6 (or 5)",
  out=[("5 driving lines then detection at 18", "subseq([r're:(?i).*driving.*\\b80\\b.*', r're:(?i).*driving.*\\b75\\b.*', r're:(?i).*driving.*\\b60\\b.*', r're:(?i).*driving.*\\b55\\b.*', r're:(?i).*driving.*\\b40\\b.*', r're:(?i).*line detected.*\\b18\\b.*'])"),
       ("stops before 10", "not re.search(r'sensor: 10\\b', out)"),
       ("tick count printed (6, or 5 if the stopping tick is not counted)", "nums([6], L=L[-1:]) or nums([5], L=L[-1:])")],
  probes=[("drive_until_line([50, 10, 5], 22) stops at 10 and counts consistently", "(lambda a, b: (a[0], b[0]) in [(2, 1), (1, 0)] and not any(re.search(r'\\b5\\b', l) for l in a[1]))(callf('drive_until_line', [50, 10, 5], 22), callf('drive_until_line', [10], 22))")],
  robotics=ROB("list of readings", ["drive_base.drive(150, 0)", "while left_color.reflection() > 22: wait(5)", "drive_base.stop()"], ["DriveBase.drive(speed, turn_rate) / stop()", "ColorSensor.reflection() scripted", "wait(ms) advancing a virtual clock", "a hard stop when scripted readings run out, or 'drive until line' loops forever"]),
  loop=("medium", "A while-loop version that forgets to advance the index floods output forever (measured: 12.0M lines / 360 MB in 2 s, CPython). With real pybricks + mock, a sensor that never reaches the line is the same hang."),
  notes="Whether the detecting tick counts is ambiguous in the task; both conventions accepted.")

E("ch12_r3", "deterministic", "values-from-variables", "the kid's own print_action text for aligned, turn_right, turn_left, drive_forward, aligned, drive_forward appears in order; aligned count 2",
  out=[("print_action output for the 6 expected actions, in order", "subseq(sum([callf('print_action', a)[1] for a in ['aligned', 'turn_right', 'turn_left', 'drive_forward', 'aligned', 'drive_forward']], []))"),
       ("aligned count 2 last", "nums([2], L=L[-1:])")],
  probes=[("analyze_alignment all 4 cases and the 22 boundary", "[val('analyze_alignment(%d, %d)' % p) for p in [(10, 12), (15, 60), (55, 18), (70, 80), (22, 22), (21, 21)]] == ['aligned', 'turn_right', 'turn_left', 'drive_forward', 'drive_forward', 'aligned']"),
          ("print_action gives 4 different messages", "len({tuple(callf('print_action', a)[1]) for a in ['aligned', 'turn_right', 'turn_left', 'drive_forward']}) == 4")],
  robotics=ROB("tuples of readings", ["left_color.reflection(), right_color.reflection()"], ["two ColorSensor mocks with independent scripts"]))

E("ch12_r4", "deterministic", "pattern", "3 Driving lines, then turn_right x3 and aligned, Squared on line!, ticks 4 (or 3) and 4; rerun with other data",
  out=[("3 driving ticks before the line", "len([l for l in L if 'driving' in l.lower()]) == 3"),
       ("phase 2 actions", "[w.lower().replace(' ', '_') for w in re.findall(r'(?i)turn[ _]right|turn[ _]left|aligned|drive[ _]forward', out)] == ['turn_right', 'turn_right', 'turn_right', 'aligned']"),
       ("Squared on line! and tick counts", "has('Squared on line!') and (nums([4, 4], L=L[-2:]) or nums([3, 4], L=L[-2:]))")],
  probes=[("rerun approach=[(80,80),(10,90)], alignment=[(10,90),(5,5)]", "(lambda t: len([l for l in t if 'driving' in l.lower()]) == 1 and [w.lower().replace(' ', '_') for w in re.findall(r'(?i)turn[ _]right|turn[ _]left|aligned|drive[ _]forward', '\\n'.join(t))] == ['turn_right', 'aligned'])(rerun({'approach': '[(80, 80), (10, 90)]', 'alignment': '[(10, 90), (5, 5)]'})[0])")],
  robotics=ROB("tuples of readings", ["drive_base.drive(100, 0) until either sensor < 22", "per-wheel left_motor.run()/right_motor.run() or drive_base.drive(0, rate) to wiggle", "drive_base.stop()"], ["two scripted ColorSensors", "Motor.run(speed)/stop()", "DriveBase.drive/stop", "iteration cap when scripts run out"]),
  loop=("medium", "CODEX shows 'while True' patterns; while-based phases that never advance the reading index hang."))

E("ch12_r5", "deterministic", "exact", "exact menu/launch sequence for 7 button presses (emoji optional); rerun buttons=['left','center'] wraps 1 -> 4",
  out=[("15 lines in order", "lines(['=== Program 2 ===', '=== Program 3 ===', r're:.*Launching Run 3\\.\\.\\.', r're:.*Run 3 complete!', '=== Program 4 ===', r're:.*Launching Run 4\\.\\.\\.', r're:.*Run 4 complete!', '=== Program 1 ===', '=== Program 4 ===', r're:.*Launching Run 4\\.\\.\\.', r're:.*Run 4 complete!', '=== Program 1 ===', r're:.*Launching Run 1\\.\\.\\.', r're:.*Run 1 complete!', '=== Program 2 ==='])")],
  probes=[("rerun buttons=['left','center']: Program 4, launch 4, Program 1", "lines(['=== Program 4 ===', r're:.*Launching Run 4\\.\\.\\.', r're:.*Run 4 complete!', '=== Program 1 ==='], L=rerun({'buttons': \"['left', 'center']\"})[0])"),
          ("show_menu(7) and run_program(2)", "callf('show_menu', 7)[1] == ['=== Program 7 ==='] and len(callf('run_program', 2)[1]) == 2")],
  robotics=ROB("list of button names", ["hub.buttons.pressed() -> {Button.LEFT}", "hub.display.number(n)", "wait(ms)"], ["hub.buttons.pressed() returning a scripted set per call", "Button enum (LEFT, RIGHT, CENTER)", "hub.display.number(n) recorded", "hub.system.set_stop_button(...) if CENTER is used for menus", "a cap: a real 'while True' menu never ends on its own"]),
  loop=("medium", "The CODEX 'Menu system' pattern is 'while True'; with the simulated list, a while loop without an exit hangs."))

E("ch12_s1", "deterministic", "values-fixed-wording-free", "readings 0..91 then 0..-46 printed, never 95 or -50; gyro_turn returns 91 and -46",
  out=[("readings up to the target, both turns", "nums([0, 15, 32, 48, 65, 78, 91, 0, -10, -22, -38, -46])"),
       ("does not print past the target", "not re.search(r'(?<![-\\d])95\\b', out) and not re.search(r'-50\\b', out)")],
  probes=[("gyro_turn returns 91 and -46", "callf('gyro_turn', 90, [0, 15, 32, 48, 65, 78, 91, 95])[0] == 91 and callf('gyro_turn', -45, [0, -10, -22, -38, -46, -50])[0] == -46"),
          ("gyro_turn(30, [0, 10, 40, 50]) returns 40 and prints 3 readings", "(lambda r: r[0] == 40 and not any(re.search(r'\\b50\\b', l) for l in r[1]))(callf('gyro_turn', 30, [0, 10, 40, 50]))")],
  robotics=ROB("list of readings", ["hub.imu.reset_heading(0)", "drive_base.drive(0, 100)", "while hub.imu.heading() < target: wait(5)"], ["hub.imu.heading() scripted per call", "DriveBase.turn/drive(0, rate)", "iteration cap"]),
  loop=("low", "A while-based version that never reaches a negative target terminates wrongly rather than hanging (measured) but one comparing with the wrong sign can spin until the list ends."))

E("ch12_s2", "deterministic", "values-fixed-wording-free", "all 4 runs fit; total used 2:16 (136 s), remaining 0:14; format_time and can_fit_run correct; rerun where a run does not fit",
  out=[("total used and remaining", "(has('2:16') or has('136')) and (has('0:14') or bool(re.search(r'\\b14\\b', out)))")],
  probes=[("format_time M:SS", "[val('format_time(%d)' % s) for s in (150, 65, 5, 0)] == ['2:30', '1:05', '0:05', '0:00']"),
          ("can_fit_run with buffer (no boundary cases)", "val('can_fit_run(100, 28)') is True and val('can_fit_run(30, 28)') is False and val('can_fit_run(33, 28, buffer=0)') is True"),
          ("rerun run_times=[100, 60]: run 2 does not fit, 50 s left", "(lambda t: any(polarity(l) == -1 for l in t) and (has('0:50', L=t) or has('50', L=t)))(rerun({'run_times': '[100, 60]'})[0])")],
  robotics=ROB("arithmetic", ["StopWatch().time()"], ["StopWatch backed by a virtual clock"]))

E("ch12_s3", "deterministic", "values-fixed-wording-free", "80.0, 12.4, 46.2 then 20 black, 45 black, 8 black, 60 white; rerun samples changes the threshold",
  out=[("averages and threshold", "nums([80, 12.4, 46.2])"),
       ("classifications", "subseq([r're:(?i).*\\b20\\b.*black.*', r're:(?i).*\\b45\\b.*black.*', r're:(?i).*\\b8\\b.*black.*', r're:(?i).*\\b60\\b.*white.*'])")],
  probes=[("average and calibrate", "val('average([1, 2, 3])') == 2 and val('calibrate([10, 10], [0, 0])') == 5"),
          ("rerun white=[60,60], black=[20,20]: 45 is now white", "subseq([r're:(?i).*\\b20\\b.*black.*', r're:(?i).*\\b45\\b.*white.*', r're:(?i).*\\b8\\b.*black.*', r're:(?i).*\\b60\\b.*white.*'], L=rerun({'white_samples': '[60, 60]', 'black_samples': '[20, 20]'})[0])")],
  robotics=ROB("lists of samples", ["[left_color.reflection() for _ in range(5)]"], ["ColorSensor.reflection() scripted"]))

E("ch12_boss", "deterministic", "values-from-variables", "menu runs Run1 then 'Run 3 not implemented'; Run2 and square_on_line are never reached by the menu, so they are probed directly",
  out=[("Run1 ran once and Run 3 is reported not implemented", "out.count('Run complete!') == 1 and has('not implemented')")],
  probes=[("speed profiles and constants", "ns.get('BLACK_LINE') == 22 and all({'straight', 'turn'} <= set(ns.get(k, {})) for k in ('SPEED_FAST', 'SPEED_SLOW'))"),
          ("arm helpers default to 600", "sig('right_arm') == (2, 1) and sig('left_arm') == (2, 1)"),
          ("square_on_line(approach, align): phase 1 stops at (18,50), phase 2 stops at (18,20) and never reads (14,12)", "(lambda t: len(t) >= 4 and not re.search(r'\\b14\\b', '\\n'.join(t)) and re.search(r'(?i)aligned|squared', '\\n'.join(t)))(callf('square_on_line', ns['approach'], ns['align'])[1])"),
          ("Run1: launch first, end_run last, arm move, 3+ moves", "(lambda r: [c for c, p in r[2] if p == 'Run1'][:1] == ['launch'] and [c for c, p in r[2] if p == 'Run1'][-1:] == ['end_run'] and any(c in ('right_arm', 'left_arm') for c, p in r[2] if p == 'Run1') and len(r[1]) >= 8)(callt('Run1()'))"),
          ("Run2: launch, square_on_line, end_run", "(lambda cs: cs[:1] == ['launch'] and 'square_on_line' in cs and cs[-1:] == ['end_run'])([c for c, p in callt('Run2()')[2] if p == 'Run2'])"),
          ("menu did not launch Run2", "'Run2' not in trace")],
  robotics=ROB("print + dicts + lists", ["everything in ch11 and ch12"], ["full mock: hub (imu, light, display, buttons), 2 Motors + DriveBase, 2 ColorSensors, wait/StopWatch, scripted sensor/button data, iteration cap"]),
  loop=("medium", "Largest program; any while-based phase or menu can hang."),
  notes="Content issue: buttons ['center','right','center'] launch Run1, move to 2, move to 3, launch 3; Run2 (and square_on_line) never execute from the menu, so no output-only rule can verify them.")

E("grind_20", "deterministic", "values-fixed-wording-free", "300.0, 400.0, 300.0 then total 1000.0; rerun waypoints; math.sqrt actually called",
  out=[("3 distances then total", "nums([300, 400, 300, 1000])")],
  probes=[("rerun waypoints=[(0,0),(3,4),(3,0)] gives 5.0, 4.0, 9.0", "nums([5, 4, 9], L=rerun({'waypoints': '[(0, 0), (3, 4), (3, 0)]'})[0])"),
          ("math.sqrt called 3+ times", "(lambda w: (rerun(patches={'math.sqrt': w[0]}), len(w[1]) >= 3)[1])(rec('math.sqrt'))")],
  robotics=ROB("arithmetic", ["drive_base.straight(distance) per segment"], ["nothing required"]),
  notes="Task says '3 waypoints' but lists 4 points (3 segments).")

E("grind_21", "deterministic", "values-fixed-wording-free", "segment times ~0.67, 1.33, 0.75 and total ~2.75 (rounded or not); rerun segments",
  out=[("times within 0.006", "nums_approx([0.67, 1.33, 0.75, 2.75])")],
  probes=[("rerun one segment dist 100 speed 50 gives 2.0 and total 2.0", "nums_approx([2.0, 2.0], L=rerun({'segments': \"[{'dist': 100, 'speed': 50}]\"})[0])")],
  robotics=ROB("arithmetic", [], ["nothing required"]))

E("grind_22", "deterministic", "values-fixed-wording-free", "min 10, max 80, average 42.85, count 6, first index 10 in order; rerun readings",
  out=[("5 results in order", "nums([10, 80, 42.85, 6, 10])")],
  probes=[("rerun readings=[50, 20, 30, 10] gives 10, 50, 27.5, 2, 1", "nums([10, 50, 27.5, 2, 1], L=rerun({'readings': '[50, 20, 30, 10]'})[0])")],
  robotics=ROB("list of readings", [], ["nothing required"]))

E("grind_23", "deterministic", "values-fixed-wording-free", "order Run1, Run3, Run4, Run2 and total 455; rerun MATCH_TIME=75 selects 280 points",
  out=[("sorted by ratio", "re.findall(r'\\bRun[1-4]\\b', out)[-4:] == ['Run1', 'Run3', 'Run4', 'Run2']"),
       ("total 455", "has('455')")],
  probes=[("rerun MATCH_TIME=75 totals 280", "has('280', L=rerun({'MATCH_TIME': '75'})[0])")],
  robotics=ROB("list of dicts", [], ["nothing required"]),
  notes="Content issue: all 4 runs fit in 150 s (136 s total), so the time-limit branch never runs with the given data; the rerun exercises it. At 75 s greedy-by-ratio and the true optimum agree (280).")
