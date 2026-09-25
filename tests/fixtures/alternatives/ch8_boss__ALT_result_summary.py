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

stats = {"attempts": 0, "won": False}
for guess in guesses:
    stats["attempts"] += 1
    answer = check_guess(guess, secret)
    print(f"Guess {guess}: too {answer}" if answer != "correct" else f"Guess {guess}: correct!")
    if answer == "correct":
        stats["won"] = True
        break

print(f"Secret number: {secret}")
if stats["won"]:
    print(f"You got it correct in {stats['attempts']} attempts!")
else:
    print(f"No luck after {stats['attempts']} attempts.")
