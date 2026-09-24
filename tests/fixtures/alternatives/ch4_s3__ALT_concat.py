guesses = ["java", "ruby", "python", "rust"]
password = "python"

for g in guesses:
    print("Trying: " + g)
    if g == password:
        print("Access granted!")
        break
