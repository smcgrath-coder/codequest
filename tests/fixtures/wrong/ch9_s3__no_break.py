choices = ["1", "2", "1", "3"]

# Menu loop
for choice in choices:
    if choice == "1":
        print("⚔️ Fight!")
    elif choice == "2":
        print("🎒 Inventory")
    elif choice == "3":
        print("👋 Goodbye!")
    else:
        print("Unknown choice")
