import random
doubles = 0
for i in range(10):
    a = random.randint(1, 6)
    b = random.randint(1, 6)
    print(f"Die 1 = {a}, Die 2 = {b}")
    if a == b:
        doubles += 1
print("Doubles:", doubles)
