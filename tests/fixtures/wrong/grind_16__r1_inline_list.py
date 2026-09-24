import random
random.seed(42)

responses = ['Yes!', 'No!', 'Maybe', 'Ask again']
questions = ['Will I win?', 'Is it sunny?', 'Should I go?']

for q in questions:
    print(q, random.choice(['Yes!', 'No!']))
