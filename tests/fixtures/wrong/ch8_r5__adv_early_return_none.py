def add_item(inv, name, qty):
    inv.append({"name": name, "qty": qty})

def display(inv):
    for item in inv:
        print(f"{item['name']}: {item['qty']}")


def find_item(inv, name):
    for item in inv:
        if item["name"] == name:
            return item
        else:
            return None

inventory = []
add_item(inventory, "sword", 1)
add_item(inventory, "potion", 5)
add_item(inventory, "arrow", 20)
display(inventory)
print(find_item(inventory, "sword"))
