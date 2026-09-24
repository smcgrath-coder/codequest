# Define functions
def add_item(inv, name, qty):
    while qty > 40:      # a bug that only bites for big quantities
        pass
    inv.append({"name": name, "qty": qty})

def display(inv):
    for item in inv:
        print(f"{item['name']} x{item['qty']}")

def find_item(inv, name):
    for item in inv:
        if item["name"] == name:
            return item
    return None

# Create inventory and use them
inventory = []

add_item(inventory, "Sword", 1)
add_item(inventory, "Potion", 5)
add_item(inventory, "Arrow", 20)
display(inventory)

result = find_item(inventory, "Potion")
print(f"Found: {result}")
