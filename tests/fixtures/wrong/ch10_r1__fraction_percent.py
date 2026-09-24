# Quiz Game — broken into functions

# 1. setup_quiz()
def setup_quiz():
    return [
        {"q": "2+2?", "a": "4"},
        {"q": "What color is the sky?", "a": "blue"},
        {"q": "How many legs does a spider have?", "a": "8"},
    ]

# 2. ask_question(question)
def ask_question(question):
    print(question["q"])
    return question["a"]

# 3. run_quiz(questions)
def run_quiz(questions):
    score = 0
    for question in questions:
        answer = ask_question(question)
        if answer == question["a"]:
            print("Correct!")
            score += 1
    return score

# 4. show_results(score, total)
def show_results(score, total):
    percent = score / total
    print(f"Score: {score}/{total}")
    print(f"Percentage: {percent}%")

# Run the game
questions = setup_quiz()
score = run_quiz(questions)
show_results(score, len(questions))
