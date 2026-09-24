import random

# Roll 2 dice 10 times
sides = [1, 2, 3, 4, 5, 6]
doubles = 0
for roll in range(1, 11):
    die1 = random.choice(sides)
    die2 = random.choice(sides)
    print(f"Roll {roll}: {die1} and {die2}")
    if die1 == die2:
        doubles += 1
print(f"Doubles: {doubles}")
