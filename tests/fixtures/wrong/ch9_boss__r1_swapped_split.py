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
    print("Round", i + 1)
    print("You chose", player_moves[i])
    print("Computer chose", c)
    w = get_winner(c, player_moves[i])
    if w == "player":
        pw += 1
        print("You win!")
    elif w == "computer":
        cw += 1
        print("You lose!")
    else:
        tw += 1
        print("Draw!")
print("Player wins:", pw)
print("Computer wins:", cw)
print("Ties:", tw)
if pw > cw:
    print("You beat the computer! You are the champion!")
elif cw > pw:
    print("The computer is the champion!")
else:
    print("Nobody is the champion - it's a draw")
print("Thanks for playing Rock, Paper, Scissors!")
