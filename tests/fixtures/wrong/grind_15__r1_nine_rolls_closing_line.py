import random
doubles = 0
for i in range(9):
    a = random.randint(1, 6)
    b = random.randint(1, 6)
    print(a, b)
    if a == b:
        doubles += 1
print("Doubles:", doubles)
print("Thanks for playing!")
