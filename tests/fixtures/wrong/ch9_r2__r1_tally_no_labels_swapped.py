import random

def flip_coin():
    return random.choice(["Heads", "Tails"])

heads = 0
tails = 0
for i in range(10):
    flip = flip_coin()
    print(flip)
    if flip == "Heads":
        tails += 1
    else:
        heads += 1
print("Heads:", heads, "Tails:", tails)
