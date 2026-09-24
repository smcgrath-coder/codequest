import random

# Roll 2 dice 10 times
doubles = 0
for roll in range(1, 11):
    a = random.randint(1, 6)
    b = random.randint(1, 6)
    print(f"Roll {roll}: {a} and {b}")
    if a == b:
        doubles += 1
print(f"In 10 rolls you got {doubles} doubles")
