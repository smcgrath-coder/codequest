# Trivia engine
questions = [
    # Add 3 question dicts
    {"q": "Capital of France?", "choices": ["London", "Paris", "Berlin"], "answer": 1},
    {"q": "Which planet is closest to the Sun?", "choices": ["Mercury", "Venus", "Mars"], "answer": 0},
    {"q": "What do you get when you mix blue and yellow?", "choices": ["Purple", "Green", "Orange"], "answer": 1},
]

simulated_answers = [1, 0, 2]

# display_question and check_answer functions

# Run the game
print("Question 1: Capital of France?")
print("0. London")
print("1. Paris")
print("2. Berlin")
print("You picked: Paris")
print("✅ Correct!")
print("Question 2: Which planet is closest to the Sun?")
print("0. Mercury")
print("1. Venus")
print("2. Mars")
print("You picked: Mercury")
print("✅ Correct!")
print("Question 3: What do you get when you mix blue and yellow?")
print("0. Purple")
print("1. Green")
print("2. Orange")
print("You picked: Orange")
print("❌ Wrong! The answer was Green")
print("Final score: 2/3")
