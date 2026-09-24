# Trivia engine
questions = [
    # Add 3 question dicts
    {"q": "Capital of France?", "choices": ["London", "Paris", "Berlin"], "answer": 1},
    {"q": "Which planet is closest to the Sun?", "choices": ["Mercury", "Venus", "Mars"], "answer": 0},
    {"q": "What do you get when you mix blue and yellow?", "choices": ["Purple", "Green", "Orange"], "answer": 1},
]

simulated_answers = [1, 0, 2]

# display_question and check_answer functions
def display_question(q, num):
    print(f"Question {num}: {q['q']}")
    for i, choice in enumerate(q["choices"]):
        print(f"{i}. {choice}")

def check_answer(q, player_choice):
    return q["choices"][player_choice] == q["answer"]

# Run the game
score = 0
for i, q in enumerate(questions):
    display_question(q, i + 1)
    player_choice = simulated_answers[i]
    print(f"You picked: {q['choices'][player_choice]}")
    if check_answer(q, player_choice):
        print("✅ Correct!")
        score += 1
    else:
        print("❌ Wrong!")

print(f"Final score: {score}/{len(questions)}")
