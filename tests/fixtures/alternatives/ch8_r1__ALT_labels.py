import random

# Roll a die
roll = random.randint(1, 6)
print("You rolled a", roll)

# Random choice
loot = random.choice(["sword", "shield", "potion"])
print("You found a " + loot + "!")

# Shuffle a list
numbers = [1, 2, 3, 4, 5]
random.shuffle(numbers)
print("Shuffled:", numbers)
