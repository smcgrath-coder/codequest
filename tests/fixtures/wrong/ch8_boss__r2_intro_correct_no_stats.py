import random

secret = random.randint(1, 20)
guesses = [10, 15, 7, 13]

def check_guess(guess, secret):
    if guess > secret:
        return "high"
    elif guess < secret:
        return "low"
    else:
        return "correct"

print("Guess correctly to win! You have 4 tries.")
stats = {"attempts": 0}
for number, guess in enumerate(guesses, 1):
    stats["attempts"] += 1
    result = check_guess(guess, secret)
    print(f"Guess {number}: {guess} is {result}")
    if result == "correct":
        break
