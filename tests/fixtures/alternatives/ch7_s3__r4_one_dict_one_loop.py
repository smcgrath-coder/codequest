# Dict comprehensions
cubes = {n: n**3 for n in range(1, 6)}
print("Cubes:", cubes)

words = ["cat", "elephant", "dog"]
lengths = {w: len(w) for w in words}
print("Word lengths:")
for word, size in lengths.items():
    print(f"  {word} -> {size} letters")
