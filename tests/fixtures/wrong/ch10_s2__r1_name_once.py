import random
random.seed(42)

names = ["Goblin", "Skeleton", "Troll", "Ghost"]

name = random.choice(names)
def generate_enemy(level):
    return {
        "name": name,
        "hp": level * 20 + random.randint(1, 10),
        "attack": level * 3 + random.randint(1, 5),
    }

for i in range(5):
    e = generate_enemy(3)
    print(f"{e['name']}: HP {e['hp']}, Attack {e['attack']}")
