import random
random.seed(42)

loot_table = [
    {"name": "Gold Coin", "rarity": "common"},
    {"name": "Health Potion", "rarity": "common"},
    {"name": "Magic Ring", "rarity": "rare"},
    {"name": "Dragon Scale", "rarity": "legendary"},
]

def get_drop(table):
    roll = random.randint(1, 100)
    if roll <= 60:
        want = "common"
    elif roll <= 90:
        want = "rare"
    else:
        want = "legendary"
    names = []
    for item in table:
        if item["rarity"] == want:
            names.append(item["name"])
    return random.choice(names)

rarity_of = {}
for item in loot_table:
    rarity_of[item["name"]] = item["rarity"]

counts = {"common": 0, "rare": 0, "legendary": 0}
for n in range(1, 11):
    name = get_drop(loot_table)
    counts[rarity_of[name]] += 1
    print(f"Drop {n}: {name}")
print(f"common: {counts['common']}, rare: {counts['rare']}, legendary: {counts['legendary']}")
