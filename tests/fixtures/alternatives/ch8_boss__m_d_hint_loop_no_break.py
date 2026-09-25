import random
secret = random.randint(1, 20)
guesses = [10, 15, 7, 13]
def check_guess(guess, secret):
    if guess > secret:
        return "high"
    elif guess < secret:
        return "low"
    else:
        return "correct"
stats = {"attempts": 0, "guesses": []}
for g in guesses:
    result = check_guess(g, secret)
    stats["attempts"] += 1
    stats["guesses"].append(g)
    print(f"Guess {g}: {result}")
print(f"Secret number: {secret}")
print(f"Attempts: {stats['attempts']}")
