choices = ["1", "2", "1", "3"]

print("=== MAIN MENU ===")
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
