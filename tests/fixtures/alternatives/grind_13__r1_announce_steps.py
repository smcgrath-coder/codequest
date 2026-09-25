# Contacts book
contacts = {"Mom": "555-0101", "Dad": "555-0102", "Grandma": "555-0103"}
contacts["Best friend"] = "555-0199"
print("Added Best friend: 555-0199")
removed = contacts.pop("Dad")
print("Removed Dad")
print("My contacts:")
for who, number in contacts.items():
    print(f"{who}: {number}")
