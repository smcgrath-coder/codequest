hero = {"name": "Aria", "level": 5}

name = hero.get("name")
weapon = hero.get("weapon", "unarmed")
shield = hero.get("shield")
print(name)
print(weapon)
print(shield)
