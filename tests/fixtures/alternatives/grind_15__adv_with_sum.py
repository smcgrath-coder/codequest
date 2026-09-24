import random

# Roll 2 dice 10 times
doubles = 0
for i in range(10):
    a = random.randint(1, 6)
    b = random.randint(1, 6)
    print(f"Roll {i + 1}: {a} + {b} = {a + b}")
    if a == b:
        doubles += 1
print(f"You rolled doubles {doubles} times!")
