import random
random.seed(42)

loot_table = [
    {"name": "Gold Coin", "rarity": "common"},
    {"name": "Health Potion", "rarity": "common"},
    {"name": "Magic Ring", "rarity": "rare"},
    {"name": "Dragon Scale", "rarity": "legendary"},
]

# get_drop function
def get_drop(table):
    roll = random.randint(1, 100)
    if roll <= 10:
        wanted = "legendary"
    elif roll <= 40:
        wanted = "rare"
    else:
        wanted = "common"
    matches = []
    for item in table:
        if item["rarity"] == wanted:
            matches.append(item)
    return random.choice(matches)

# Simulate 10 drops
common = 0
rare = 0
legendary = 0
for i in range(10):
    drop = get_drop(loot_table)
    print("You got:", drop["name"])
    if drop["rarity"] == "common":
        common += 1
    elif drop["rarity"] == "rare":
        rare += 1
    else:
        legendary += 1
print("Common drops:", common)
print("Rare drops:", rare)
print("Legendary drops:", legendary)
