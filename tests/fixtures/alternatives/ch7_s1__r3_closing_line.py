hero = {"name": "Aria", "level": 5}

print(hero.get("name"))
print(hero.get("weapon", "unarmed"))
print(hero.get("shield"))
print("No crashes, even for missing keys!")
