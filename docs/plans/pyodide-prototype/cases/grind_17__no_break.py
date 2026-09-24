import random
random.seed(42)

guesses = [10, 5, 15, 12, 8]

secret = random.randint(1, 20)

for guess in guesses:
    if guess > secret:
        print("Too high")
    elif guess < secret:
        print("Too low")
    else:
        print("Correct!")
