inventory = ["Sword", "Shield", "Potion", "Arrow"]
counts = [1, 1, 5, 20]

# 1. Add Gem
inventory.append("Gem")
counts.append(3)

# 2. Remove Shield from both lists
inventory.pop(1)
counts.pop(1)

# 3. Print formatted inventory
for i in range(len(inventory)):
    print(f"{inventory[i]} x{counts[i]}")

# 4. Print total
print(f"Total items: {sum(counts)}")
