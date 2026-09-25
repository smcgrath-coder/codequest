import random
random.seed(42)

names = ["Goblin", "Skeleton", "Troll", "Ghost"]

def generate_enemy(level):
    return {"name": random.choice(names), "hp": level * 20 + random.randint(1, 10), "attack": level * 3 + random.randint(1, 5)}

enemies = []
for i in range(5):
    e = generate_enemy(3)
    enemies.append(e)
    print(f"Enemy {i + 1}: {e['name']} (HP {e['hp']}, ATK {e['attack']})")
strongest = max(enemies, key=lambda e: e["hp"])
print(f"Watch out for the {strongest['name']}!")
