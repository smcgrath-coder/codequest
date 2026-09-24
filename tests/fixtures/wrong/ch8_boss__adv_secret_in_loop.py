import random

guesses = [10, 15, 7, 13]
def check_guess(guess, secret):
    if guess > secret:
        return "high"
    elif guess < secret:
        return "low"
    else:
        return "correct"


stats = {"attempts": 0}
for guess in guesses:
    secret = random.randint(1, 20)
    stats["attempts"] += 1
    result = check_guess(guess, secret)
    print(f"Guess {guess}: {result}")
    if result == "correct":
        break
print(f"Attempts: {stats['attempts']}")
