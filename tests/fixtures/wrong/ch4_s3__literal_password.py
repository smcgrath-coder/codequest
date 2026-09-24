guesses = ["java", "ruby", "python", "rust"]
password = "python"

for guess in guesses:
    print(f"Trying: {guess}")
    if guess == "python":
        print("Access granted!")
        break
