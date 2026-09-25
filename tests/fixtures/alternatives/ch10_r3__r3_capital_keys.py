# Inventory system
inventory = {}

def add_item(inv, item, qty=1):
    inv[item] = inv.get(item, 0) + qty

def remove_item(inv, item, qty=1):
    inv[item] = inv[item] - qty
    if inv[item] == 0:
        del inv[item]

def show_inventory(inv):
    if not inv:
        print("Empty!")
        return
    for name in inv:
        print(f"- {name} x{inv[name]}")

# Test it
add_item(inventory, "Potion", 3)
add_item(inventory, "Sword")
add_item(inventory, "Arrow", 2)
show_inventory(inventory)
print()
remove_item(inventory, "Potion")
remove_item(inventory, "Arrow", 2)
show_inventory(inventory)
