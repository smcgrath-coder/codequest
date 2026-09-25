questions = [
    {"q": "Capital of France?", "choices": ["London", "Paris", "Berlin"], "answer": 1},
    {"q": "Largest ocean?", "choices": ["Pacific", "Atlantic", "Indian"], "answer": 0},
    {"q": "How many sides does a triangle have?", "choices": ["4", "5", "3"], "answer": 1},
]

simulated_answers = [1, 0, 2]

def display_question(q, num):
    print(f"Q{num}: {q['q']}")
    for i, c in enumerate(q["choices"]):
        print(f"  {i}) {c}")

def check_answer(q, player_choice):
    return player_choice == q["answer"]

for i in range(3):
    display_question(questions[i], i + 1)
    if check_answer(questions[i], simulated_answers[i]):
        print("Correct!")
    else:
        print("Wrong!")
print("Final score: 2/3")
