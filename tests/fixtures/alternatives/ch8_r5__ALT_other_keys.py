# Define functions
def add_item(inv, name, qty):
    item = {"item": name, "amount": qty}
    inv.append(item)

def display(inv):
    for thing in inv:
        print(f"- {thing['item']}: {thing['amount']}")

def find_item(inv, name):
    for thing in inv:
        if thing["item"] == name:
            return thing
    return None

# Create inventory and use them
inventory = []
add_item(inventory, "Rope", 2)
add_item(inventory, "Lantern", 1)
add_item(inventory, "Apple", 6)
display(inventory)
print("Search result:", find_item(inventory, "Lantern"))
