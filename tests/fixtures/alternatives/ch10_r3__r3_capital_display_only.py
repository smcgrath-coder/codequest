inventory = {}

def add_item(inv, item, qty=1):
    inv[item] = inv.get(item, 0) + qty

def remove_item(inv, item, qty=1):
    inv[item] -= qty
    if inv[item] <= 0:
        del inv[item]

def show_inventory(inv):
    if not inv:
        print("Empty!")
    for item in inv:
        print(item.capitalize() + ": " + str(inv[item]))

add_item(inventory, "Potion", 3)
add_item(inventory, "Sword", 1)
add_item(inventory, "Arrow", 2)
show_inventory(inventory)
remove_item(inventory, "Potion", 1)
remove_item(inventory, "Arrow", 2)
show_inventory(inventory)
