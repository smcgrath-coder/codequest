import random

# Set secret number (use random.randint(1, 20))
secret = random.randint(1, 20)

# Simulated guesses
guesses = [10, 15, 7, 13]

# check_guess function
def check_guess(guess, secret):
    if guess > secret:
        return "high"
    if guess < secret:
        return "low"
    return "correct"

# Game loop
stats = {"attempts": 0, "wins": 0}
for i in range(len(guesses)):
    stats["attempts"] = stats["attempts"] + 1
    result = check_guess(guesses[i], secret)
    if result == "correct":
        stats["wins"] = stats["wins"] + 1
        print("Guess", i + 1, "was", guesses[i], "- correct!")
    else:
        print("Guess", i + 1, "was", guesses[i], "- too", result)

# Print stats
print("----- Stats -----")
print(f"The secret number was {secret}")
print(f"You made {stats['attempts']} attempts and got it right {stats['wins']} time(s)")
