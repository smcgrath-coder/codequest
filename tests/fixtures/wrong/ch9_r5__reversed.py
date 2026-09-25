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
    guess = guesses[i]
    print(f"Round {i + 1}: The card is {first}. You guess {guess}.")
    second = draw_card()
    print(f"The next card is {second}.")
    if (guess == "high" and second < first) or (guess == "low" and second > first):
        score += 1
        print("Correct!")
    else:
        print("Wrong!")

print(f"Final score: {score}/5")
