# Three functions that work together
def calc_attack(level):
    return level * 3

def calc_defense(level):
    return level * 2 + 5

def power_rating(level):
    return level * 5 + 5

print(power_rating(1))
print(power_rating(5))
print(power_rating(10))
