import random
random.seed(42)

player_moves = ["rock", "paper", "scissors", "rock", "paper"]

# get_winner function
def get_winner(player, computer):
    if player == computer:
        return "tie"
    if (player, computer) in [("rock", "scissors"), ("scissors", "paper"), ("paper", "rock")]:
        return "player"
    return "computer"

# Play 5 rounds
names = {"player": "You", "computer": "Computer", "tie": "Nobody"}
you = 0
comp = 0
for r in range(5):
    computer = random.choice(["rock", "paper", "scissors"])
    winner = get_winner(player_moves[r], computer)
    print(f"Round {r + 1}: {player_moves[r]} vs {computer}")
    print(f"Winner: {names[winner]}")
    if winner == "player":
        you += 1
    elif winner == "computer":
        comp += 1

# Final results
print(f"Score - You: {you}  Computer: {comp}")
print("Champion:", "You" if you > comp else "Computer" if comp > you else "Nobody")
