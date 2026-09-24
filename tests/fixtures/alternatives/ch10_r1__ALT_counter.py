# Quiz Game — broken into functions

# 1. setup_quiz()
def setup_quiz():
    questions = []
    questions.append({"q": "What is 5 x 3?", "a": "15"})
    questions.append({"q": "What planet do we live on?", "a": "Earth"})
    questions.append({"q": "How many days are in a week?", "a": "7"})
    return questions

# 2. ask_question(question)
def ask_question(question):
    print("Q: " + question["q"])
    return question["a"]

# 3. run_quiz(questions)
def run_quiz(questions):
    score = 0
    for i in range(len(questions)):
        answer = ask_question(questions[i])
        if answer == questions[i]["a"]:
            score = score + 1
    return score

# 4. show_results(score, total)
def show_results(score, total):
    percent = round(score * 100 / total)
    print(f"You got {score} out of {total} ({percent}%)")

# Run the game
quiz = setup_quiz()
final_score = run_quiz(quiz)
show_results(final_score, len(quiz))
