guesses = ["java", "ruby", "python", "rust"]
password = "python"
print("Trying each password...")
for guess in guesses:
    print("Trying: guess")
    if guess == password:
        print("Access granted!")
        break
