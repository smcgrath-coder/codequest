inventory = ["Sword", "Shield", "Potion", "Arrow"]
counts = [1, 1, 5, 20]

# 1. Add Gem
inventory.append("Gem")
counts.append(3)

# 2. Remove Shield from both lists
spot = inventory.index("Shield")
inventory.remove("Shield")
counts.pop(spot)

# 3. Print formatted inventory
print("=== INVENTORY ===")
for i, item in enumerate(inventory):
    print(f"{item} x{counts[i]}")

# 4. Print total
print("Total items:", sum(counts))
