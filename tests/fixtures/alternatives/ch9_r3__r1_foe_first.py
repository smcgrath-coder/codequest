import random

player_wins = 0
enemy_wins = 0
ties = 0

# 5 rounds of dice battle
for round_num in range(1, 6):
    foe = random.randint(1, 6)
    hero = random.randint(1, 6)
    print(f"Round {round_num}: You rolled {hero}, Enemy rolled {foe}")
    if hero > foe:
        player_wins += 1
        print("You win this round!")
    elif foe > hero:
        enemy_wins += 1
        print("Enemy wins this round!")
    else:
        ties += 1
        print("It's a tie! Nobody wins.")

print(f"Final score: You {player_wins}, Enemy {enemy_wins}, Ties {ties}")
if player_wins > enemy_wins:
    print("🏆 You are the winner!")
elif enemy_wins > player_wins:
    print("💀 The enemy is the winner!")
else:
    print("It's a draw!")
