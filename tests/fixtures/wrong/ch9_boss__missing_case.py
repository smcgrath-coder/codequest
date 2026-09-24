import random
random.seed(42)

player_moves = ["rock", "paper", "scissors", "rock", "paper"]

# get_winner function
def get_winner(player, computer):
    if player == computer:
        return "tie"
    elif player == "rock" and computer == "scissors":
        return "player"
    elif player == "scissors" and computer == "paper":
        return "player"
    else:
        return "computer"

# Play 5 rounds
player_wins = 0
computer_wins = 0

for i in range(5):
    player = player_moves[i]
    computer = random.choice(["rock", "paper", "scissors"])
    winner = get_winner(player, computer)
    print(f"Round {i + 1}: You chose {player}, Computer chose {computer}")
    if winner == "player":
        player_wins += 1
        print("You win this round!")
    elif winner == "computer":
        computer_wins += 1
        print("Computer wins this round!")
    else:
        print("It's a tie!")

# Final results
print(f"Final score: You {player_wins}, Computer {computer_wins}")
if player_wins > computer_wins:
    print("🏆 You are the champion!")
elif computer_wins > player_wins:
    print("🤖 The computer is the champion!")
else:
    print("It's a draw! No champion this time.")
