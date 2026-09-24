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

pw = 0
cw = 0
tw = 0
for i in range(5):
    c = random.choice(["rock", "paper", "scissors"])
    w = get_winner(player_moves[i], c)
    if w == "player":
        pw += 1
    elif w == "computer":
        cw += 1
    print(f"Round {i+1}: {player_moves[i]} vs {c} -> {w}")
print(f"Score: {pw}-{cw}")
print("Champion ->", "player" if pw > cw else "computer" if cw > pw else "tie")
