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
        rarity = "common"
    elif roll <= 90:
        rarity = "rare"
    else:
        rarity = "legendary"
    return random.choice([item for item in table if item["rarity"] == rarity])

counts = {"common": 0, "rare": 0, "legendary": 0}
for i in range(10):
    drop = get_drop(loot_table)
    print(f"Drop {i + 1}: {drop['name']}")
    counts[drop["rarity"]] += 1
print("Loot summary:")
for r in counts:
    print(f"  {r.title()} x{counts[r]}")
