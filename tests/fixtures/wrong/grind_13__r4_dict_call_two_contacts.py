# Contacts book
contacts = dict(Amy="555-1111", Ben="555-2222")
contacts["Dan"] = "555-4444"
contacts.pop("Ben")

for name, phone in contacts.items():
    print(name, phone)
