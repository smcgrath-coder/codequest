inventory = ["Sword", "Shield", "Potion", "Arrow"]
counts = [1, 1, 5, 20]

# 1. Add Gem
inventory.append("Gem")
counts.append(3)

# 2. Remove Shield from both lists
idx = inventory.index("Shield")
inventory.pop(idx)
counts.pop(idx)

# 3. Print formatted inventory
for i in range(len(inventory)):
    print(f"{inventory[i]} x{counts[i]}")

# 4. Print total
total = 0
for count in counts:
    total += count
print(f"Total items: {total}")
