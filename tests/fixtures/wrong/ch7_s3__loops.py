# Dict comprehensions
cubes = {}
for n in range(1, 6):
    cubes[n] = n ** 3
lengths = {}
for w in ["cat", "elephant", "dog"]:
    lengths[w] = len(w)
print(cubes)
print(lengths)
