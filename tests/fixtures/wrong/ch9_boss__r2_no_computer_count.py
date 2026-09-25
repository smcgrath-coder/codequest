import random
random.seed(42)

player_moves = ["rock", "paper", "scissors", "rock", "paper"]

def get_winner(player, computer):
    if player == computer:
        return "tie"
    elif player == "rock" and computer == "scissors":
        return "player"
    elif player == "scissors" and computer == "paper":
        return "player"
    elif player == "paper" and computer == "rock":
        return "player"
    else:
        return "computer"

player_wins = 0
computer_wins = 0
for i in range(5):
    player = player_moves[i]
    computer = random.choice(["rock", "paper", "scissors"])
    winner = get_winner(player, computer)
    print(f"Round {i + 1}: {player} vs {computer} - winner: {winner}")
    if winner == "player":
        player_wins += 1

print(f"Final score: You {player_wins}, Computer {computer_wins}")
if player_wins > computer_wins:
    print("You are the champion!")
elif computer_wins > player_wins:
    print("The computer is the champion!")
else:
    print("It's a draw - no champion!")
