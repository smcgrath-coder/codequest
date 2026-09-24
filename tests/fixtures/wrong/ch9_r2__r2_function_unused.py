import random

# flip_coin function
def flip_coin():
    return random.choice(["Heads", "Tails"])

# Flip 10 times and count
heads = 0
tails = 0
for i in range(10):
    flip = random.choice(["Heads", "Tails"])
    print(flip)
    if flip == "Heads":
        heads += 1
    else:
        tails += 1
print("Heads:", heads, "Tails:", tails)
