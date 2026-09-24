import random
print(round(random.random() * 6, 2))
print(random.choice(["sword", "shield", "potion"]))
nums = [1, 2, 3, 4, 5]
random.shuffle(nums)
print(nums)
