responses = ["y", "y", "y", "n"]
i = 0
round_num = 1

# Game loop
while True:
    print(f"⚔️ Round {round_num}!")
    answer = responses[i]
    print("Continue? (y/n): " + answer)
    i += 1
    if answer == "n":
        print("Game Over!")
        break
    round_num += 1

print("Thanks for playing!")
