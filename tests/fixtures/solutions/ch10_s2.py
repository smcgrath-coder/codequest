import random
random.seed(42)

names = ["Goblin", "Skeleton", "Troll", "Ghost"]

# generate_enemy function
def generate_enemy(level):
    return {
        "name": random.choice(names),
        "hp": level * 20 + random.randint(1, 10),
        "attack": level * 3 + random.randint(1, 5),
    }

# Generate and print 5 enemies
for i in range(5):
    enemy = generate_enemy(3)
    print(f"Enemy {i + 1}: {enemy['name']} | HP: {enemy['hp']} | Attack: {enemy['attack']}")
