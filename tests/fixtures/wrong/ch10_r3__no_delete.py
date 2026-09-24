# Inventory system
inventory = {}

# add_item, remove_item, show_inventory
def add_item(inv, item, qty=1):
    if item in inv:
        inv[item] += qty
    else:
        inv[item] = qty

def remove_item(inv, item, qty=1):
    inv[item] -= qty

def show_inventory(inv):
    print("🎒 Inventory:")
    if len(inv) == 0:
        print("Empty!")
    else:
        for item, count in inv.items():
            print(f"  {item}: {count}")

# Test it
add_item(inventory, "potion", 3)
add_item(inventory, "sword")
add_item(inventory, "arrow", 2)
show_inventory(inventory)

remove_item(inventory, "potion")
remove_item(inventory, "arrow", 2)
show_inventory(inventory)
