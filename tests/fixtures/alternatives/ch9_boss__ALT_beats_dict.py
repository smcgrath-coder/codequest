import random
random.seed(42)

player_moves = ["rock", "paper", "scissors", "rock", "paper"]

# get_winner function
def get_winner(player, computer):
    beats = {"rock": "scissors", "paper": "rock", "scissors": "paper"}
    if player == computer:
        return "tie"
    if beats[player] == computer:
        return "player"
    return "computer"

# Play 5 rounds
scores = {"player": 0, "computer": 0}
for move in player_moves:
    computer = random.choice(["rock", "paper", "scissors"])
    winner = get_winner(move, computer)
    print(f"{move} vs {computer}: {winner}")
    if winner != "tie":
        scores[winner] += 1

# Final results
print(f"Player {scores['player']} - Computer {scores['computer']}")
if scores["player"] > scores["computer"]:
    print("Champion: player")
elif scores["computer"] > scores["player"]:
    print("Champion: computer")
else:
    print("No champion - it's even")
