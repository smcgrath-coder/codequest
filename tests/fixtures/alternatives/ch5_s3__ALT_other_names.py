# List comprehensions
doubles = [n + n for n in range(1, 6)]
long = [word for word in ["hi", "hello", "hey", "howdy"] if len(word) >= 4]
print("Doubles:", doubles)
print("Long words:", long)
