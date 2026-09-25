# Contacts book
contacts = dict(Amy="555-1111", Ben="555-2222", Cal="555-3333")
contacts["Dan"] = "555-4444"

for name, phone in contacts.items():
    print(name, phone)

del contacts["Ben"]
