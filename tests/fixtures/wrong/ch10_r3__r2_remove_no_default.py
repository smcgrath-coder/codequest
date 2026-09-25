inventory = {}

def add_item(inv, item, qty=1):
    if item in inv:
        inv[item] += qty
    else:
        inv[item] = qty

def remove_item(inv, item, qty):
    inv[item] -= qty
    if inv[item] == 0:
        del inv[item]

def show_inventory(inv):
    if len(inv) == 0:
        print("Empty!")
    for item in inv:
        print(item, inv[item])

add_item(inventory, "potion", 3)
add_item(inventory, "sword")
add_item(inventory, "arrow", 2)
show_inventory(inventory)
remove_item(inventory, "potion", 1)
remove_item(inventory, "arrow", 2)
show_inventory(inventory)
