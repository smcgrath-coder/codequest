import random
random.seed(42)

guesses = ["high", "low", "high", "high", "low"]

# draw_card function
def draw_card():
    return random.randint(1, 13)

# Play 5 rounds
score = 0
card = draw_card()
for guess in guesses:
    print(f"Card: {card}. Guess: {guess}")
    new_card = draw_card()
    print(f"New card: {new_card}")
    if (guess == "high" and new_card > card) or (guess == "low" and new_card < card):
        score += 1
        print("Correct!")
    else:
        print("Wrong!")
    card = new_card
print(f"Score: {score}")
