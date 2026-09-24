import random

# Roll 2 dice 10 times
doubles = 0
for i in range(10):
    die1 = random.randint(1, 6)
    die2 = random.randint(1, 6)
    print(f"Die 1: {die1}, Die 2: {die2}")
    if die1 == die2:
        doubles += 1
print("Doubles rolled:", doubles)
