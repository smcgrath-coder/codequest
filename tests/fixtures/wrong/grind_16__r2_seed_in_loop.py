import random

responses = ['Yes!', 'No!', 'Maybe', 'Ask again']
questions = ['Will I win?', 'Is it sunny?', 'Should I go?']

for q in questions:
    random.seed(42)
    print(q)
    print(random.choice(responses))
