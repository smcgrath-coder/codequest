import random
from random import randint

player_wins = 0
enemy_wins = 0
ties = 0

# 5 rounds of dice battle
for r in range(5):
    enemy = randint(1, 6)
    player = randint(1, 6)
    print("Round", r + 1)
    print("Player rolls", player)
    print("Enemy rolls", enemy)
    if player > enemy:
        print("Player wins the round")
        player_wins += 1
    elif player < enemy:
        print("Enemy wins the round")
        enemy_wins += 1
    else:
        print("Tie - nobody wins")
        ties += 1

print("Player wins:", player_wins)
print("Enemy wins:", enemy_wins)
print("Ties:", ties)
if player_wins > enemy_wins:
    print("Overall winner: Player")
elif enemy_wins > player_wins:
    print("Overall winner: Enemy")
else:
    print("Overall: it's a draw")
