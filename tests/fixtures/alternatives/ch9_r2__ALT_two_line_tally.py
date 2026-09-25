import random

# flip_coin function
def flip_coin():
    return random.choice(["Heads", "Tails"])

# Flip 10 times and count
heads = 0
tails = 0
for i in range(10):
    result = flip_coin()
    print(result)
    if result == "Heads":
        heads = heads + 1
    else:
        tails = tails + 1
print("Heads:", heads)
print("Tails:", tails)
