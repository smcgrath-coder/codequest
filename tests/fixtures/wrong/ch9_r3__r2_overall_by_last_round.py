import random

player_wins = 0
enemy_wins = 0
ties = 0

for r in range(1, 6):
    player = random.randint(1, 6)
    enemy = random.randint(1, 6)
    print(f"Round {r}: You rolled {player}, Enemy rolled {enemy}")
    if player > enemy:
        player_wins += 1
        print("You win this round!")
    elif enemy > player:
        enemy_wins += 1
        print("Enemy wins this round!")
    else:
        ties += 1
        print("Tie!")

print(f"Final score: You {player_wins}, Enemy {enemy_wins}, Ties {ties}")
if player > enemy:
    print("🏆 You are the winner!")
elif enemy > player:
    print("💀 The enemy is the winner!")
else:
    print("It's a draw!")
