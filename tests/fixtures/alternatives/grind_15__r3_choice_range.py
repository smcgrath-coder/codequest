import random

# Roll 2 dice 10 times
doubles = 0
for i in range(10):
    a = random.choice(range(1, 7))
    b = random.choice(range(1, 7))
    print(a, b)
    if a == b:
        doubles += 1
print("Doubles:", doubles)
