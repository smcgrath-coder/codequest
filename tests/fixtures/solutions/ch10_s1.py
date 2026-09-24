import random
random.seed(42)

loot_table = [
    # Add items with rarity
    {"name": "Gold Coin", "rarity": "common"},
    {"name": "Health Potion", "rarity": "common"},
    {"name": "Magic Ring", "rarity": "rare"},
    {"name": "Dragon Scale", "rarity": "legendary"},
]

# get_drop function
def get_drop(table):
    roll = random.randint(1, 100)
    if roll <= 60:
        rarity = "common"
    elif roll <= 90:
        rarity = "rare"
    else:
        rarity = "legendary"
    items = [item for item in table if item["rarity"] == rarity]
    return random.choice(items)

# Simulate 10 drops
counts = {"common": 0, "rare": 0, "legendary": 0}

for i in range(10):
    drop = get_drop(loot_table)
    print(f"Drop {i + 1}: {drop['name']} ({drop['rarity']})")
    counts[drop["rarity"]] += 1

print("Drops by rarity:")
for rarity, count in counts.items():
    print(f"{rarity}: {count}")
