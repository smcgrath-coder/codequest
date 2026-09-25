choices = ["1", "2", "1", "3"]

for choice in choices:
    if choice == "1":
        print("⚔️ Fight!")
    elif choice == "2":
        print("🎒 Inventory")
    elif choice == "3":
        print("👋 Goodbye!")
        break
    else:
        print("Unknown choice")
else:
    print("No more choices, goodbye!")
