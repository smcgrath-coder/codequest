responses = ["y", "y", "y", "n"]
i = 0
round_num = 1

while True:
    print(f"⚔️ Round {round_num}!")
    answer = responses[i]
    i += 1
    if answer == "n":
        print("💀 Game Over!")
        break
    round_num += 1
