contacts = {"Amy": "555-1111", "Ben": "555-2222", "Cara": "555-3333"}
contacts["Dan"] = "555-4444"
print("Added Dan (555-4444)")
print("Deleting Ben (" + contacts["Ben"] + ")")
del contacts["Ben"]
for name, phone in contacts.items():
    print(name, phone)
