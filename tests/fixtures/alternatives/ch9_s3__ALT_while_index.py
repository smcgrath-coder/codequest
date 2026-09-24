choices = ["1", "2", "1", "3"]

# Menu loop
i = 0
while i < len(choices):
    choice = choices[i]
    if choice == "3":
        print("Goodbye!")
        break
    elif choice == "1":
        print("Fight!")
    elif choice == "2":
        print("Inventory")
    else:
        print("Unknown choice")
    i += 1
