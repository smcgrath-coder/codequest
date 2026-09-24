import random
random.seed(42)

guesses = ["high", "low", "high", "high", "low"]

def draw_card():
    return random.randint(1, 13)

score = 0
card = draw_card()
print("First card:", card)
for i in range(5):
    new_card = draw_card()
    guess = guesses[i]
    print(f"Round {i + 1}: you guess {guess}, next card is {new_card}")
    if guess == "high" and new_card > card:
        score += 1
    elif guess == "low" and new_card < card:
        score += 1
print("Final score:", score)
