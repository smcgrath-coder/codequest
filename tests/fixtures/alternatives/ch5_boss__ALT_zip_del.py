inventory = ["Sword", "Shield", "Potion", "Arrow"]
counts = [1, 1, 5, 20]

# 1. Add Gem
inventory.append("Gem")
counts.append(3)

# 2. Remove Shield from both lists
spot = inventory.index("Shield")
del inventory[spot]
del counts[spot]

# 3. Print formatted inventory
for item, count in zip(inventory, counts):
    print(item + " x" + str(count))

# 4. Print total
print("Total:", sum(counts))
