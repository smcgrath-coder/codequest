import random

# Set secret number (use random.randint(1, 20))
secret = random.randint(1, 20)

# Simulated guesses
guesses = [10, 15, 7, 13]

def check_guess(guess, secret):
    if guess > secret:
        return "high"
    elif guess < secret:
        return "low"
    else:
        return "correct"


# Game loop
stats = {"attempts": 0}
messages = {"high": "Too high!", "low": "Too low!", "correct": "You got it!"}
for guess in guesses:
    stats["attempts"] += 1
    result = check_guess(guess, secret)
    print(f"You guessed {guess}... {messages[result]}")
    if result == "correct":
        break

# Print stats
print(f"The secret was {secret}. You used {stats['attempts']} attempts.")
