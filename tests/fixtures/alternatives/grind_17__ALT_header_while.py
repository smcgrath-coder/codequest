import random
random.seed(42)

guesses = [10, 5, 15, 12, 8]

secret = random.randint(1, 20)
print("I'm thinking of a number from 1 to 20...")
i = 0
while i < len(guesses):
    guess = guesses[i]
    if guess == secret:
        print(f"{guess}: Correct!")
        break
    elif guess > secret:
        print(f"{guess}: Too high")
    else:
        print(f"{guess}: Too low")
    i += 1
