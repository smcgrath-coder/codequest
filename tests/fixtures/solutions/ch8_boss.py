import random

# Set secret number (use random.randint(1, 20))
secret = random.randint(1, 20)

# Simulated guesses
guesses = [10, 15, 7, 13]

# check_guess function
def check_guess(guess, secret):
    if guess > secret:
        return "high"
    elif guess < secret:
        return "low"
    else:
        return "correct"

# Game loop
stats = {"attempts": 0, "guesses": [], "won": False}
for guess in guesses:
    stats["attempts"] += 1
    stats["guesses"].append(guess)
    result = check_guess(guess, secret)
    print(f"Guess {stats['attempts']}: {guess} is {result}")
    if result == "correct":
        stats["won"] = True
        break

# Print stats
print(f"Secret number: {secret}")
print(f"Attempts: {stats['attempts']}")
print(f"Guesses: {stats['guesses']}")
if stats["won"]:
    print("You got it!")
else:
    print("Out of guesses!")
