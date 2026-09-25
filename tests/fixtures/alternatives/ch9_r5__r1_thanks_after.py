import random
random.seed(42)

guesses = ["high", "low", "high", "high", "low"]

# draw_card function
def draw_card():
    return random.randint(1, 13)

# Play 5 rounds
score = 0
for i in range(5):
    first = draw_card()
    print("Round", i + 1, "- your card is", first)
    guess = guesses[i]
    second = draw_card()
    print("You guessed", guess, "and the next card is", second)
    if guess == "high" and second > first:
        score = score + 1
        print("Correct!")
    elif guess == "low" and second < first:
        score = score + 1
        print("Correct!")
    else:
        print("Wrong!")

print("Final score:", score, "out of 5")
print("Thanks for playing!")
