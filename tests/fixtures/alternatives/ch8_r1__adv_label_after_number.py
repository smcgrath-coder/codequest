import random

# Roll a die
print("You rolled a", random.randint(1, 6), "on a 6-sided die")

# Random choice
print(random.choice(["sword", "shield", "potion"]))

# Shuffle a list
nums = [1, 2, 3, 4, 5]
random.shuffle(nums)
print(nums)
