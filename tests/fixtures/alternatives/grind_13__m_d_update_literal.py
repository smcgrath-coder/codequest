contacts = {"Luna": "111-2222", "Max": "333-4444", "Kai": "555-6666"}
contacts.update({"Ivy": "777-8888"})
removed = contacts.pop("Max")
print("Removed Max:", removed)
for pair in contacts.items():
    print(pair[0], pair[1])
