import random

def flip_coin():
    return random.choice(["Heads", "Tails"])

print("Heads or Tails? Let's flip 10 times!")
heads = 0
tails = 0
for i in range(10):
    flip = flip_coin()
    print(f"Flip {i + 1}: {flip}")
    if flip == "Heads":
        heads += 1
    else:
        tails += 1
print(f"Heads: {heads}, Tails: {tails}")
