import random

# Roll 2 dice 10 times
doubles = 0
for roll in range(10):
    first = random.randrange(1, 7)
    second = random.randrange(1, 7)
    print("Roll", roll + 1, "->", first, second)
    if first == second:
        doubles = doubles + 1
print("You rolled doubles", doubles, "times")
