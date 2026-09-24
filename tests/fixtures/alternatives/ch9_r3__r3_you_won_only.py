import random

player_wins = 0
enemy_wins = 0
ties = 0

for round_num in range(1, 6):
    me = random.randint(1, 6)
    foe = random.randint(1, 6)
    print(f"Round {round_num}: 🎲 {me} vs {foe}")
    if me > foe:
        player_wins += 1
        print("You take the round!")
    elif foe > me:
        enemy_wins += 1
        print("The enemy takes the round!")
    else:
        ties += 1
        print("Tie, nobody wins.")

print(f"Final score: You {player_wins}, Enemy {enemy_wins}, Ties {ties}")
if player_wins > enemy_wins:
    print("🏆 You are the overall winner!")
elif enemy_wins > player_wins:
    print("💀 You won only " + str(player_wins) + " rounds. The enemy is the overall winner!")
else:
    print("It's a draw!")
