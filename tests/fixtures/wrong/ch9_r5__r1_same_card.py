import random
random.seed(42)

guesses = ["high", "low", "high", "high", "low"]

def draw_card():
    return random.randint(1, 13)

score = 0
first = draw_card()
second = draw_card()
for i in range(5):
    guess = guesses[i]
    print(f"Round {i + 1}: {first} then {second}, you said {guess}")
    if (guess == "high" and second > first) or (guess == "low" and second < first):
        score += 1
        print("Correct!")
    else:
        print("Wrong!")
print(f"Final score: {score}")
