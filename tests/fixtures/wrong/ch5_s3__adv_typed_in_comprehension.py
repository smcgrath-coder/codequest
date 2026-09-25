# List comprehensions
doubles = [x for x in [2, 4, 6, 8, 10]]
words = ["hi", "hello", "hey", "howdy"]
long = [w for w in words if len(w) > 3]
print(doubles)
print(long)
