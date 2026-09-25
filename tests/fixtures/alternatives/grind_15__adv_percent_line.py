import random

# Roll 2 dice 10 times
doubles = 0
for i in range(10):
    d1 = random.randint(1, 6)
    d2 = random.randint(1, 6)
    print(d1, d2)
    if d1 == d2:
        doubles += 1
print(f"Doubles rolled: {doubles} ({doubles * 10}%)")
