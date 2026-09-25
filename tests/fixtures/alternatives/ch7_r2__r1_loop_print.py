player = {"name": "Hero", "xp": 0, "gold": 50}
player["level"] = 1
player["gold"] = player["gold"] + 25
player["xp"] = 100
player["title"] = "Adventurer"
for key, value in player.items():
    print(f"{key}: {value}")
