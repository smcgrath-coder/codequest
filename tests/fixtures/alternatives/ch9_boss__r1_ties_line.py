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

player_wins = 0
computer_wins = 0
ties = 0
for i in range(5):
    player = player_moves[i]
    computer = random.choice(["rock", "paper", "scissors"])
    winner = get_winner(player, computer)
    print(f"Round {i + 1}: {player} vs {computer} -> {winner} wins" if winner != "tie" else f"Round {i + 1}: {player} vs {computer} -> tie")
    if winner == "player":
        player_wins += 1
    elif winner == "computer":
        computer_wins += 1
    else:
        ties += 1

print("Final score:")
print("You:", player_wins)
print("Computer:", computer_wins)
print("Ties:", ties)
if player_wins > computer_wins:
    print("Champion: You!")
elif computer_wins > player_wins:
    print("Champion: Computer!")
else:
    print("No champion - it's a draw!")
