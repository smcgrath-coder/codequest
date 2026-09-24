# Dict comprehensions
cubes = {n: n**3 for n in range(1, 6)}
words = ["cat", "elephant", "dog"]
lengths = {w: n for w, n in zip(words, [3, 8, 3])}
print(cubes)
print(lengths)
