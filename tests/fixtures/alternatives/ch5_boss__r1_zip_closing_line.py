inventory = ["Sword", "Shield", "Potion", "Arrow"]
counts = [1, 1, 5, 20]
inventory.append("Gem")
counts.append(3)
where = inventory.index("Shield")
del inventory[where]
del counts[where]
for item, count in zip(inventory, counts):
    print(f"{item} x{count}")
print(f"Total: {sum(counts)}")
print("The archive is organized!")
