import random

# Roll a die
print(random.randint(1, 6))
# Random choice
print(random.choice(["sword", "shield"]))
# Shuffle a list
nums = [1, 2, 3, 4, 5]
random.shuffle(nums)
print(nums)
