import random

# Roll a die
print(random.randint(1, 6))

# Random choice
items = ["sword", "shield", "potion"]
print(items[random.randint(0, 2)])

# Shuffle a list
my_list = [1, 2, 3, 4, 5]
random.shuffle(my_list)
print(my_list)
