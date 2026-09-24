import random

# Roll a die
print("You rolled:", random.randint(1, 6))

# Random choice
print("You found a", random.choice(["sword", "shield", "potion"]))

# Shuffle a list
my_list = [1, 2, 3, 4, 5]
print("Before:", my_list)
random.shuffle(my_list)
print("After:", my_list)
