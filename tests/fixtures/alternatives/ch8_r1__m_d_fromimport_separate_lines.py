from random import randint, choice, shuffle

die = randint(1, 6)
item = choice(["sword", "shield", "potion"])
deck = [1, 2, 3, 4, 5]
shuffle(deck)
print(f"Dice: {die}")
print(f"Item: {item}")
print(f"Shuffled: {deck}")
