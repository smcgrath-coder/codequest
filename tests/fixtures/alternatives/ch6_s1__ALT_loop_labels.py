# Three functions that work together
def calc_attack(level):
    return level * 3

def calc_defense(level):
    return level * 2 + 5

def power_rating(level):
    attack = calc_attack(level)
    defense = calc_defense(level)
    return attack + defense

for lvl in [1, 5, 10]:
    print(f"Level {lvl} power: {power_rating(lvl)}")
