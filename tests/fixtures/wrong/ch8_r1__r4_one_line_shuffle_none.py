import random

die = random.randint(1, 6)
item = random.choice(["sword", "shield", "potion"])
deck = [1, 2, 3, 4, 5]
print(f"Dice: {die}, item: {item}, deck: {random.shuffle(deck)}")
