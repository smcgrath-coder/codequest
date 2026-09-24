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

stats = {"attempts": 0}
for guess in guesses:
    stats["attempts"] += 1
    print(f"Guess {stats['attempts']}: {guess} is {check_guess(guess, secret)}")

print(f"Secret number: {secret}")
print(f"Attempts: {stats['attempts']}")
