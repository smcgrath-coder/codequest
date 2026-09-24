import random

# Roll a die
print("Dice roll:", random.randint(1, 6))

# Random choice
loot = random.choice(["sword", "shield", "potion"])

# Shuffle a list
order = [1, 2, 3, 4, 5]
random.shuffle(order)
print("Loot:", loot, "- turn order:", order)
