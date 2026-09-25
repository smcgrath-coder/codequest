inventory = {}

def add_item(inv, item, qty=1):
    if item in inv:
        inv[item] += qty
    else:
        inv[item] = qty

def remove_item(inv, item, qty=1):
    inv[item] -= qty
    if inv[item] <= 0:
        del inv[item]

def show_inventory(inv):
    for item in inv:
        print(f"{item}: {inv[item]}")
    print("Empty!")

add_item(inventory, "potion", 3)
add_item(inventory, "sword")
add_item(inventory, "arrow", 2)
show_inventory(inventory)
remove_item(inventory, "potion")
remove_item(inventory, "arrow", 2)
show_inventory(inventory)
