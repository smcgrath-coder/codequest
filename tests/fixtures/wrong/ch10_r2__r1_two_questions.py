questions = [
    {"q": "Capital of France?", "choices": ["London", "Paris", "Berlin"], "answer": 1},
    {"q": "Biggest ocean?", "choices": ["Pacific", "Atlantic", "Indian"], "answer": 0},
    {"q": "Which animal says moo?", "choices": ["Dog", "Cat", "Cow"], "answer": 1},
]

simulated_answers = [1, 0, 2]

def display_question(q, num):
    print(f"Question {num}: {q['q']}")
    for i, choice in enumerate(q["choices"]):
        print(f"  {i}. {choice}")

def check_answer(q, player_choice):
    return player_choice == q["answer"]

score = 0
for i in range(2):
    q = questions[i]
    display_question(q, i + 1)
    if check_answer(q, simulated_answers[i]):
        print("Correct!")
        score += 1
    else:
        print("Wrong!")
print(f"Final score: {score}/3")
