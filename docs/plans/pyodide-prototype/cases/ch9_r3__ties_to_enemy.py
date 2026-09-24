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
        print("You win!")
    else:
        enemy_wins += 1
        print("Enemy wins!")

print(f"Final: You {player_wins}, Enemy {enemy_wins}, Ties {ties}")
