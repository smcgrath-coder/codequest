import random

player_wins = 0
enemy_wins = 0
ties = 0

def play_round(n):
    a = random.randint(1, 6)
    b = random.randint(1, 6)
    print(f"Round {n}: {a} vs {b}")
    if a > b:
        print("You win!")
        return "player"
    if b > a:
        print("Enemy wins!")
        return "enemy"
    print("Tie!")
    return "tie"

for n in range(1, 6):
    w = play_round(n)
    if w == "player":
        player_wins += 1
    elif w == "enemy":
        enemy_wins += 1
    else:
        ties += 1
print("Final:", player_wins, enemy_wins, ties)
print("You win the game!" if player_wins > enemy_wins else "Enemy wins the game!" if enemy_wins > player_wins else "Draw!")
