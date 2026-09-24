import random

# Roll 2 dice 10 times
die1 = random.randint(1, 6)
die2 = random.randint(1, 6)
doubles = 0
for roll in range(10):
    print(die1, die2)
    if die1 == die2:
        doubles += 1
print("Doubles:", doubles)
