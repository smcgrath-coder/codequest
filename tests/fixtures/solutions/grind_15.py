import random

# Roll 2 dice 10 times
doubles = 0
for roll in range(1, 11):
    die1 = random.randint(1, 6)
    die2 = random.randint(1, 6)
    print(f"Roll {roll}: {die1} and {die2}")
    if die1 == die2:
        doubles += 1

print(f"Doubles: {doubles}")
