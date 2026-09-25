import random
die = random.randrange(1, 7)
print("Dice roll:", die)
loot = random.choice(["sword", "shield", "potion"])
print("Loot:", loot)
cards = [1, 2, 3, 4, 5]
random.shuffle(cards)
print("Shuffled:", cards)
