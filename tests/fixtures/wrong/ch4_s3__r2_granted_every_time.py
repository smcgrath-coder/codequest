guesses = ["java", "ruby", "python", "rust"]
password = "python"
for guess in guesses:
    print(f"Trying: {guess}")
    print("Access granted!")
    if guess == password:
        break
