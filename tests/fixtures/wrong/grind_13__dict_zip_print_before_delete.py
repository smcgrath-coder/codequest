# Contacts book
names = ["Rosa", "Theo", "Uma"]
phones = ["555-2001", "555-2002", "555-2003"]
contacts = dict(zip(names, phones))
contacts["Vic"] = "555-2004"

for name, phone in contacts.items():
    print(name, phone)

del contacts["Theo"]
