import random

# Roll 2 dice 10 times
doubles = 0
for roll in range(10):
    a = random.randint(1, 5)
    b = random.randint(1, 5)
    print(a, b)
    if a == b:
        doubles += 1
print("Doubles:", doubles)
