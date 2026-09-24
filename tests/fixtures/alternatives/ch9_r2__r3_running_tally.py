import random

def flip_coin():
    return random.choice(["Heads", "Tails"])

heads = 0
tails = 0
for i in range(10):
    flip = flip_coin()
    if flip == "Heads":
        heads += 1
    else:
        tails += 1
    print(f"Flip {i + 1}: {flip}   (Heads so far: {heads}, Tails so far: {tails})")
print(f"Final tally: Heads = {heads}, Tails = {tails}")
