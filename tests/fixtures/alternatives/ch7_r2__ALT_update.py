player = {"name": "Hero", "xp": 0, "gold": 50}

player.update({"level": 1})
player["gold"] = player["gold"] + 25
player.update(xp=100, title="Adventurer")
print(player)
