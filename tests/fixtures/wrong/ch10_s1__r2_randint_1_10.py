import random
random.seed(42)

loot_table = [
    {"name": "Gold Coin", "rarity": "common"},
    {"name": "Health Potion", "rarity": "common"},
    {"name": "Magic Ring", "rarity": "rare"},
    {"name": "Dragon Scale", "rarity": "legendary"},
]

def get_drop(table):
    roll = random.randint(1, 10)
    if roll <= 6:
        rarity = "common"
    elif roll <= 9:
        rarity = "rare"
    else:
        rarity = "legendary"
    return random.choice([i for i in table if i["rarity"] == rarity])

counts = {"common": 0, "rare": 0, "legendary": 0}
for i in range(10):
    d = get_drop(loot_table)
    print(f"Drop {i + 1}: {d['name']} ({d['rarity']})")
    counts[d["rarity"]] += 1
print(counts)
