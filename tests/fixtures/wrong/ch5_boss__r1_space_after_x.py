inventory = ["Sword", "Shield", "Potion", "Arrow"]
counts = [1, 1, 5, 20]
inventory.append("Gem")
counts.append(3)
idx = inventory.index("Shield")
inventory.pop(idx)
counts.pop(idx)
for i in range(len(inventory)):
    print(inventory[i], "x", counts[i])
print("Total:", sum(counts))
