# Define functions
def add_item(inv, name, qty):
    inv.append({"name": name, "qty": qty})

def display(inv):
    for item in inv:
        print(f"{item['name']} x{item['qty']}")

def find_item(inv, name):
    for item in inv:
        if item["name"] == name:
            print(f"Found: {item}")

# Create inventory and use them
inventory = []

add_item(inventory, "Sword", 1)
add_item(inventory, "Potion", 5)
add_item(inventory, "Arrow", 20)
display(inventory)
find_item(inventory, "Potion")
