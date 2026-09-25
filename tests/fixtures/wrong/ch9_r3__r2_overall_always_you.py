import random

player_wins = 0
enemy_wins = 0
ties = 0

for r in range(1, 6):
    player = random.randint(1, 6)
    enemy = random.randint(1, 6)
    print(f"Round {r}: You {player} vs Enemy {enemy}")
    if player > enemy:
        player_wins += 1
        print("You win the round!")
    elif enemy > player:
        enemy_wins += 1
        print("Enemy wins the round!")
    else:
        ties += 1
        print("Tie!")

print(f"Final: You {player_wins}, Enemy {enemy_wins}, Ties {ties}")
print("🏆 You are the overall winner!")
