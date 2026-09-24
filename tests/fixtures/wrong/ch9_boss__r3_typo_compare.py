import random
random.seed(42)

player_moves = ["rock", "paper", "scissors", "rock", "paper"]

def get_winner(player, computer):
    if player == computer:
        return "tie"
    beats = {"rock": "scissors", "scissors": "paper", "paper": "rock"}
    if beats[player] == computer:
        return "player"
    return "computer"

player_wins = 0
computer_wins = 0
for i in range(5):
    computer = random.choice(["rock", "paper", "scissors"])
    winner = get_winner(player_moves[i], computer)
    print(f"Round {i + 1}: You chose {player_moves[i]}, Computer chose {computer}. Winner: {winner}")
    if winner == "player":
        player_wins += 1
    elif winner == "computer":
        computer_wins += 1

print(f"Final score: You {player_wins}, Computer {computer_wins}")
if player_wins > player_wins:
    print("🏆 You are the champion!")
elif computer_wins > player_wins:
    print("🤖 The computer is the champion!")
else:
    print("It's a draw! No champion this time.")
