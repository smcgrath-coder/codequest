def setup_quiz():
    return [
        {"q": "2+2?", "a": "4"},
        {"q": "What color is the sky?", "a": "blue"},
        {"q": "How many legs does a spider have?", "a": "8"},
    ]

def ask_question(question):
    print(question["q"])
    return question["a"]

def run_quiz(questions):
    score = 0
    for question in questions:
        answer = ask_question(question)
        if answer == question["a"]:
            score += 1
        return score

def show_results(score, total):
    print(f"Score: {score}/{total}")
    print(f"Percentage: {score / total * 100}%")

questions = setup_quiz()
score = run_quiz(questions)
show_results(score, len(questions))
