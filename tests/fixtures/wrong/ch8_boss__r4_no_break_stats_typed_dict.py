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
for guess in guesses:
    print(f"{guess} is {check_guess(guess, secret)}")

# Print stats
stats = {"attempts": len([10, 15, 7, 13])}
print(f"Attempts: {stats['attempts']}")
