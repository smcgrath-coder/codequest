contacts = {"Amy": "555-1111", "Ben": "555-2222", "Cara": "555-3333"}
new_name = "Dan"
new_phone = "555-4444"
contacts[new_name] = new_phone
print(f"Added {new_name} ({new_phone})")
del contacts["Ben"]
print("Deleted Ben")
print("Contacts:")
for name, phone in contacts.items():
    print(name, phone)
