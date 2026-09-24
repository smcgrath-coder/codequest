import random
roll = int(random.random() * 6) + 1
print("You rolled", roll)
print(random.choice(["sword", "shield", "potion"]))
nums = [1, 2, 3, 4, 5]
random.shuffle(nums)
print(nums)
