# Inventory system
inventory = {}

# add_item, remove_item, show_inventory
def add_item(inv, item, qty=1):
    inv[item] = inv.get(item, 0) + qty
    print(f"Added {qty} {item}")

def remove_item(inv, item, qty=1):
    if item in inv:
        inv[item] = inv[item] - qty
        if inv[item] == 0:
            del inv[item]
        print(f"Removed {qty} {item}")

def show_inventory(inv):
    if not inv:
        print("Empty!")
        return
    for item in inv:
        print(f"{item} x{inv[item]}")

# Test it
add_item(inventory, "potion", 3)
add_item(inventory, "sword")
add_item(inventory, "arrow", 2)
show_inventory(inventory)
remove_item(inventory, "potion")
remove_item(inventory, "arrow", 2)
show_inventory(inventory)
