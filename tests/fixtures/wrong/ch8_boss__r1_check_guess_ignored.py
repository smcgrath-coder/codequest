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
    check_guess(g, secret)
    if g > secret:
        print(g, "is too high")
    elif g < secret:
        print(g, "is too low")
    else:
        print(g, "is correct!")
        break
print("Attempts:", stats["attempts"])
