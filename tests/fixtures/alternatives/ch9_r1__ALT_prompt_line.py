responses = ["y", "y", "y", "n"]
i = 0
round_num = 1

# Game loop
while True:
    print("Round " + str(round_num) + "!")
    print("Continue? (y/n): ")
    if responses[i] == "n":
        print("Game Over!")
        break
    i = i + 1
    round_num = round_num + 1
