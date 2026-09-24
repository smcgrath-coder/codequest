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

stats = {"attempts": 0}
for guess in guesses:
    stats["attempts"] += 1
    result = check_guess(guess, secret)
    if result == "correct":
        print(f"{guess} is correct! You took {stats['attempts']} attempts.")
        break
    print(f"{guess} is too {result}")
