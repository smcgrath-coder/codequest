questions = [
    {"q": "Capital of France?", "choices": ["London", "Paris", "Berlin"], "answer": 1},
    {"q": "Which planet is closest to the Sun?", "choices": ["Mercury", "Venus", "Mars"], "answer": 0},
    {"q": "What do you get when you mix blue and yellow?", "choices": ["Purple", "Green", "Orange"], "answer": 1},
]

simulated_answers = [1, 0, 2]

def display_question(q, num):
    print(f"Question {num}: {q['q']}")
    for i, choice in enumerate(q["choices"]):
        print(f"  {i}) {choice}")

def check_answer(q, player_choice):
    return player_choice == q["answer"]

score = 0
for i, q in enumerate(questions):
    display_question(q, i + 1)
    if check_answer(q, simulated_answers[i]):
        print("Correct!")
        score += 1
    else:
        print("Wrong!")
print(f"Final score: {score}/3")
print(f"That's {round(score / 3 * 100)}% correct!")
