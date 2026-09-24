# Contacts book
phone_book = {"Ann": "111-2222", "Ben": "333-4444", "Cy": "555-6666"}
phone_book["Di"] = "777-8888"
phone_book.pop("Ben")
for who, number in phone_book.items():
    print(who, "can be reached at", number)
