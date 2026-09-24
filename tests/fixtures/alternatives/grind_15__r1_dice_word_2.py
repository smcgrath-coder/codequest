import random
doubles = 0
for i in range(10):
    a = random.randint(1, 6)
    b = random.randint(1, 6)
    print(f"Roll {i+1}: dice {a} {b}")
    if a == b:
        doubles += 1
print("Doubles:", doubles)
