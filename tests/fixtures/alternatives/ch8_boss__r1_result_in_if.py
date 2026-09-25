import random
secret = random.randint(1, 20)
guesses = [10, 15, 7, 13]
def check_guess(guess, secret):
    if guess > secret:
        return "high"
    elif guess < secret:
        return "low"
    return "correct"
stats = {"attempts": 0}
for g in guesses:
    stats["attempts"] += 1
    if check_guess(g, secret) == "correct":
        print(g, "is correct!")
        break
    print(g, "is too", check_guess(g, secret))
print("Attempts:", stats["attempts"])
