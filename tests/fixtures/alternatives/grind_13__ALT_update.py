# Contacts book
contacts = {"Alice": "555-1234", "Bob": "555-5678", "Charlie": "555-9012"}
contacts.update({"Dana": "555-4321"})
del contacts["Bob"]
for name, phone in contacts.items():
    print(name, phone)
