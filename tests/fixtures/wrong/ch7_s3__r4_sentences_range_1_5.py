# Dict comprehensions
cubes = {n: n**3 for n in range(1, 5)}
lengths = {w: len(w) for w in ["cat", "elephant", "dog"]}
for n, c in cubes.items():
    print(f"{n} cubed is {c}")
for w, size in lengths.items():
    print(f"{w} has {size} letters")
