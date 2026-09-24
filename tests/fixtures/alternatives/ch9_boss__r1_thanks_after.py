import random
random.seed(42)

player_moves = ["rock", "paper", "scissors", "rock", "paper"]

def get_winner(player, computer):
    if player == computer:
        return "tie"
    elif (player == "rock" and computer == "scissors") or (player == "scissors" and computer == "paper") or (player == "paper" and computer == "rock"):
        return "player"
    else:
        return "computer"

you = 0
cpu = 0
for i in range(5):
    computer = random.choice(["rock", "paper", "scissors"])
    result = get_winner(player_moves[i], computer)
    print("Round", i + 1, ":", player_moves[i], "vs", computer, "- winner:", result)
    if result == "player":
        you += 1
    elif result == "computer":
        cpu += 1

print("Final score - You:", you, "Computer:", cpu)
if you > cpu:
    print("You are the overall champion!")
elif cpu > you:
    print("The computer is the overall champion!")
else:
    print("It's a draw - no champion!")
print("Thanks for playing Rock Paper Scissors!")
