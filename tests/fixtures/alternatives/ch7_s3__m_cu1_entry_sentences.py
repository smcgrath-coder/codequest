# Dict comprehensions
cubes = {num: num * num * num for num in range(1, 6)}
lengths = {animal: len(animal) for animal in ["cat", "elephant", "dog"]}
for n, c in cubes.items():
    print(f"{n} cubed is {c}")
for animal, size in lengths.items():
    print(f"{animal} has {size} letters")
