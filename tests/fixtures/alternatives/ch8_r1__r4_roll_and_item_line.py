import random

# Roll a die
roll = random.randint(1, 6)

# Random choice
item = random.choice(["sword", "shield", "potion"])
print(f"You rolled a {roll} and found a {item}!")

# Shuffle a list
cards = [1, 2, 3, 4, 5]
random.shuffle(cards)
print("Shuffled cards:", cards)
