# List comprehensions
doubles = [i * 2 for i in range(1, 6)]
words = ["hi", "hello", "hey", "howdy"]
long = [w for w in words if len(w) > 3]
print(doubles)
print(long)
