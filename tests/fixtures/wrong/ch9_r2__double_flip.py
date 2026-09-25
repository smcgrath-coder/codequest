import random

# flip_coin function
def flip_coin():
    return random.choice(["Heads", "Tails"])

# Flip 10 times and count
heads = 0
tails = 0
for i in range(10):
    print(f"Flip {i + 1}: {flip_coin()}")
    if flip_coin() == "Heads":
        heads += 1
    else:
        tails += 1

print(f"Final tally: Heads = {heads}, Tails = {tails}")
