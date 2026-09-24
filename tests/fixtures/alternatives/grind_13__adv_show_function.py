# Contacts book
def show(name, phone):
    print(name, "->", phone)

contacts = {"Amy": "555-1111", "Ben": "555-2222", "Cara": "555-3333"}
contacts["Dan"] = "555-4444"
del contacts["Ben"]
for name, phone in contacts.items():
    show(name, phone)
