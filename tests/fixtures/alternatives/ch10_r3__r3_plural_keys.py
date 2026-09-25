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
    if len(inv) == 0:
        print("Empty!")
    for item, count in inv.items():
        print(f"{item}: {count}")

add_item(inventory, "potions", 3)
add_item(inventory, "sword")
add_item(inventory, "arrows", 2)
show_inventory(inventory)
remove_item(inventory, "potions")
remove_item(inventory, "arrows", 2)
show_inventory(inventory)
