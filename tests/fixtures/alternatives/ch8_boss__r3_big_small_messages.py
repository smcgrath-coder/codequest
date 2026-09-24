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
    result = check_guess(g, secret)
    if result == "high":
        print(g, "- too big!")
    elif result == "low":
        print(g, "- too small!")
    else:
        print(g, "- that's it! Correct!")
        break

# Print stats
print("Attempts:", stats["attempts"])
