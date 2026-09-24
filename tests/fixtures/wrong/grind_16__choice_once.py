import random
random.seed(42)

responses = ["Yes!", "No!", "Maybe", "Ask again"]
questions = ["Will I win?", "Is it sunny?", "Should I go?"]

answer = random.choice(responses)
for question in questions:
    print(question)
    print(answer)
