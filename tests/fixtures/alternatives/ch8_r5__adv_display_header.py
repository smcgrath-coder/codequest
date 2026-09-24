# Define functions
def add_item(inv, name, qty):
    inv.append({"name": name, "qty": qty})

def display(inv):
    print("--- Inventory ---")
    for item in inv:
        print(f"{item['name']}: {item['qty']}")

def find_item(inv, name):
    for item in inv:
        if item["name"] == name:
            return item
    return None

# Create inventory and use them
inventory = []
add_item(inventory, "rope", 2)
add_item(inventory, "torch", 5)
add_item(inventory, "apple", 9)
display(inventory)
found = find_item(inventory, "torch")
if found:
    print("Found", found["name"], "x", found["qty"])
else:
    print("Not found")
