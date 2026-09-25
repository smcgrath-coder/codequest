import random
doubles = 0
for i in range(10):
    d1 = random.randint(1, 6)
    d2 = random.randint(1, 6)
    print(d1, d2)
    if d1 == d2:
        doubles += 1
print("Doubles:", doubles)
print("Thanks for playing!")
