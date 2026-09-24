# Trivia engine
questions = [
    {"q": "Capital of France?", "choices": ["London", "Paris", "Berlin"], "answer": 1},
    {"q": "Biggest ocean?", "choices": ["Pacific", "Atlantic", "Indian"], "answer": 0},
    {"q": "Which animal says moo?", "choices": ["Dog", "Cat", "Cow"], "answer": 2},
]

simulated_answers = [1, 0, 2]

# display_question and check_answer functions
def display_question(q, num):
    print("Q" + str(num) + ": " + q["q"])
    number = 1
    for choice in q["choices"]:
        print("  " + str(number) + ") " + choice)
        number += 1

def check_answer(q, player_choice):
    if player_choice == q["answer"]:
        return True
    else:
        return False

# Run the game
score = 0
num = 1
for q in questions:
    display_question(q, num)
    if check_answer(q, simulated_answers[num - 1]):
        print("Correct!")
        score += 1
    else:
        print("Wrong")
    num += 1
print("Final score: " + str(score) + " out of " + str(len(questions)))
