# Contacts book
contacts = {}
contacts["Amy"] = "555-1111"
contacts["Ben"] = "555-2222"
contacts["Cat"] = "555-3333"

contacts["Dan"] = "555-4444"
del contacts["Ben"]

for name, phone in contacts.items():
    print(f"{name}: {phone}")
