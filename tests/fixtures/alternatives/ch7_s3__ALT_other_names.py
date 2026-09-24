# Dict comprehensions
cubes = {x: x * x * x for x in range(1, 6)}
animals = ["cat", "elephant", "dog"]
lengths = {animal: len(animal) for animal in animals}
print("Cubes:", cubes)
print("Lengths:", lengths)
