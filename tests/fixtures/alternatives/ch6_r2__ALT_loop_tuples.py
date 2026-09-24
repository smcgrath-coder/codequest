# Define hero_status with two parameters
def hero_status(name, level):
    print(name + " - Level " + str(level))

# Call with 3 different heroes
for hero, lvl in [("Knight", 5), ("Archer", 2), ("Wizard", 9)]:
    hero_status(hero, lvl)
