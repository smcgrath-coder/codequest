guesses = ["java", "ruby", "python", "rust"]
password = "python"
for guess in guesses:
    print(f"Trying: {guess}")
    if guess == password:
        print("Access granted!")
        break
    else:
        print("Wrong password")
