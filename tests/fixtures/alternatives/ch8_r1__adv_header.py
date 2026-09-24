import random

# Roll a die
print("Welcome to the dice game!")
print(random.randint(1, 6))

# Random choice
print(random.choice(["sword", "shield", "potion"]))

# Shuffle a list
my_list = [1, 2, 3, 4, 5]
random.shuffle(my_list)
print(my_list)
