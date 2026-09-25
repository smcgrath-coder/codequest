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

stats = {"attempts": 0, "high": 0, "low": 0}
for guess in guesses:
    stats["attempts"] += 1
    result = check_guess(guess, secret)
    print(f"Guess {guess} is {result}")
    if result == "correct":
        break
    stats[result] += 1

print(f"Attempts: {stats['attempts']}, too high: {stats['high']}, too low: {stats['low']}")
