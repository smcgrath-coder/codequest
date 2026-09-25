import random

player_wins = 0
enemy_wins = 0
ties = 0

# 5 rounds of dice battle
for round_num in range(1, 6):
    player = random.randint(1, 6)
    enemy = random.randint(1, 6)
    print(f"Round {round_num}: You rolled {player}, Enemy rolled {enemy}")
    if player > enemy:
        player_wins += 1
        print("Winner: Player 1")
    elif enemy > player:
        enemy_wins += 1
        print("Winner: Player 2")
    else:
        ties += 1
        print("Winner: none")

print(f"Final score: You {player_wins}, Enemy {enemy_wins}, Ties {ties}")
if player_wins > enemy_wins:
    print("Champion: Player 1")
elif enemy_wins > player_wins:
    print("Champion: Player 2")
else:
    print("It's a draw!")
