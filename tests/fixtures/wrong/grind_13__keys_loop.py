contacts = {"Alice": "555-1234", "Bob": "555-5678", "Charlie": "555-9012"}
contacts["Dana"] = "555-4321"
del contacts["Bob"]
for name in contacts:
    print(f"{name}: {contacts[name]}")
