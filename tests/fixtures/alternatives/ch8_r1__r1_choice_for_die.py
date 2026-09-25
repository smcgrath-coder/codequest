import random

# Roll a die
roll = random.choice([1, 2, 3, 4, 5, 6])
print("You rolled a", roll)

# Random choice
print("You found a", random.choice(["sword", "shield", "potion"]))

# Shuffle a list
numbers = [1, 2, 3, 4, 5]
random.shuffle(numbers)
print(numbers)
