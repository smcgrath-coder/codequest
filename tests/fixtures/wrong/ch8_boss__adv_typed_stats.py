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


for guess in guesses:
    result = check_guess(guess, secret)
    print(f"Guess {guess}: {result}")
    if result == "correct":
        break
stats = {"attempts": 4}
print("Stats:", stats)
