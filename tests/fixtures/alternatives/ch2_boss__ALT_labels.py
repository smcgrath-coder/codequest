name = "Zara"
level = 3
health = 75.5

attack = level * 3.5
defense = level * 2 + 10
power = attack + defense

print("=== " + name + " ===")
print("Level", level, "| Health", health)
print("ATK", attack, "| DEF", defense)
print("POWER RATING:", power)
