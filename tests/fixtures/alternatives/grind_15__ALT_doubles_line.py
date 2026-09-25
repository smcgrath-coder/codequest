import random

# Roll 2 dice 10 times
doubles = 0
for turn in range(10):
    a = random.randint(1, 6)
    b = random.randint(1, 6)
    print("Rolled", a, "and", b)
    if a == b:
        print("Doubles!")
        doubles = doubles + 1
print("Total doubles:", doubles)
