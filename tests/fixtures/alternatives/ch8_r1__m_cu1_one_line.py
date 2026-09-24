from random import randint, choice, shuffle

# Roll a die
die = randint(1, 6)

# Random choice
item = choice(["sword", "shield", "potion"])

# Shuffle a list
deck = [1, 2, 3, 4, 5]
shuffle(deck)

print(f"Dice: {die} | Item: {item} | Shuffled: {deck}")
