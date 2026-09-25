hero = {"name": "Aria", "level": 5}

name = hero.get("name")
weapon = hero.get("weapon", "Unarmed")
shield = hero.get("shield")
print(f"{name} is {weapon} and has shield = {shield}")
