# Contacts book
contacts = {"Amy": "555-1111", "Bob": "555-2222", "Cat": "555-3333"}
contacts["Dan"] = "555-4444"
contacts.pop("Bob")
print("My contacts:")
for name, phone in contacts.items():
    print(f"{name}: {phone}")
