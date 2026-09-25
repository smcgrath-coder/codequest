import random

# Set secret number (use random.randint(1, 20))
secret = random.randint(1, 20)

# Simulated guesses
guesses = [10, 15, 7, 13]

stats = {"attempts": 0}

# check_guess function
def check_guess(guess, secret):
    stats["attempts"] += 1
    if guess > secret:
        return "high"
    elif guess < secret:
        return "low"
    else:
        return "correct"

# Game loop
for guess in guesses:
    result = check_guess(guess, secret)
    print(f"Guess {stats['attempts']}: {guess} is {result}")
    if result == "correct":
        break

# Print stats
print(f"The secret was {secret}")
print(f"Attempts: {stats['attempts']}")
