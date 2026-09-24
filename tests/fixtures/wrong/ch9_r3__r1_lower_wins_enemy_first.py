import random

player_wins = 0
enemy_wins = 0
ties = 0

for round_num in range(1, 6):
    enemy = random.randint(1, 6)
    player = random.randint(1, 6)
    print(f"Round {round_num}: You rolled {player}, Enemy rolled {enemy}")
    if player < enemy:
        player_wins += 1
        print("You win!")
    elif enemy < player:
        enemy_wins += 1
        print("Enemy wins!")
    else:
        ties += 1
        print("Tie!")

print(f"Final score: You {player_wins}, Enemy {enemy_wins}, Ties {ties}")
