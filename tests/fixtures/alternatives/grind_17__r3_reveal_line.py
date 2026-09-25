import random
random.seed(42)

guesses = [10, 5, 15, 12, 8]
secret = random.randint(1, 20)
found = False
for guess in guesses:
    if guess > secret:
        print(guess, "is too high")
    elif guess < secret:
        print(guess, "is too low")
    else:
        print("Correct!")
        found = True
        break
if not found:
    print("The correct number was", secret)
