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

scores = {"player": 0, "computer": 0, "tie": 0}
for i in range(5):
    computer = random.choice(["rock", "paper", "scissors"])
    winner = get_winner(player_moves[i], computer)
    scores[winner] += 1
    if winner == "tie":
        print(f"Round {i + 1}: {player_moves[i]} vs {computer} - it's a tie")
    else:
        print(f"Round {i + 1}: {player_moves[i]} vs {computer} - {winner} wins")

print(f"Final score: You {scores['player']}, Computer {scores['computer']}, Ties {scores['tie']}")
if scores["player"] > scores["computer"]:
    print("🏆 You are the champion!")
elif scores["computer"] > scores["player"]:
    print("🤖 The computer is the champion!")
else:
    print("Neither player wins, it's a draw!")
