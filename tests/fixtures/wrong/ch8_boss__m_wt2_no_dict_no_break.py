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
attempts = 0
for g in guesses:
    attempts += 1
    print(f"Guess {g}: {check_guess(g, secret)}")

# Print stats
print(f"Secret: {secret}")
print(f"Attempts: {attempts}")
