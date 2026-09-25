import random

# Roll 2 dice 10 times
doubles = 0
for roll in range(1, 11):
    d1 = random.randint(1, 6)
    d2 = random.randint(1, 6)
    if d1 == d2:
        doubles += 1
    print(f"Roll {roll}: {d1} {d2}   (doubles so far: {doubles})")
print(f"Total doubles: {doubles}")
