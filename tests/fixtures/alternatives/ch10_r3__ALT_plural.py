# Inventory system
inventory = {}

# add_item, remove_item, show_inventory
def add_item(inv, item, qty=1):
    inv[item] = inv.get(item, 0) + qty

def remove_item(inv, item, qty=1):
    inv[item] = inv[item] - qty
    if inv[item] == 0:
        del inv[item]

def show_inventory(inv):
    if inv == {}:
        print("Empty!")
    for item in inv:
        print(f"{item}s: {inv[item]}")

# Test it
add_item(inventory, "potion", 3)
add_item(inventory, "sword")
add_item(inventory, "arrow", 2)
show_inventory(inventory)
remove_item(inventory, "potion")
remove_item(inventory, "arrow", 2)
show_inventory(inventory)
