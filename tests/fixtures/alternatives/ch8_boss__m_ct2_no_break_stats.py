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
stats = {"high": 0, "low": 0, "correct": 0, "attempts": 0}
for guess in guesses:
    answer = check_guess(guess, secret)
    stats[answer] += 1
    stats["attempts"] += 1
    print("You guessed", guess, "and it was", answer)

# Print stats
print("=== GAME OVER ===")
print("The secret was", secret)
print("Attempts:", stats["attempts"])
print("Too high:", stats["high"])
print("Too low:", stats["low"])
print("Correct:", stats["correct"])
