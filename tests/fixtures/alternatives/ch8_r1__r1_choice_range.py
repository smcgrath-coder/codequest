import random
print("Roll:", random.choice(range(1, 7)))
print("Item:", random.choice(["sword", "shield", "potion"]))
nums = [1, 2, 3, 4, 5]
random.shuffle(nums)
print("Shuffled:", nums)
