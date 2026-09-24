# List comprehensions
doubles = []
for i in range(1, 6):
    doubles.append(i * 2)
words = ["hi", "hello", "hey", "howdy"]
long = []
for w in words:
    if len(w) > 3:
        long.append(w)
print(doubles)
print(long)
