import random
random.seed(42)

responses = ["Yes!", "No!", "Maybe", "Ask again"]
questions = ["Will I win?", "Is it sunny?", "Should I go?"]

while questions:
    q = questions.pop(0)
    print("You ask: " + q)
    print("🎱 The 8-Ball says: " + random.choice(responses))
