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
stats = {"attempts": 0}
for g in guesses:
    stats["attempts"] += 1
    if g > secret:
        print(g, "is too high")
    elif g < secret:
        print(g, "is too low")
    else:
        print(g, "is correct!")
        break

# Print stats
print("Attempts:", stats["attempts"])
