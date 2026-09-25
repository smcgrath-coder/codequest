import random

# Set secret number (use random.randint(1, 20))
secret = random.randint(1, 20)

# Simulated guesses
guesses = [10, 15, 7, 13]

# check_guess function
def check_guess(guess, secret):
    if guess == secret:
        return "correct"
    if guess > secret:
        return "high"
    return "low"

# Game loop
history = {}
for number, guess in enumerate(guesses, start=1):
    result = check_guess(guess, secret)
    history[number] = result
    print(f"Attempt {number}: {guess} -> {result}")
    if result == "correct":
        break

# Print stats
print("The secret was", secret)
print("Attempts used:", len(history))
