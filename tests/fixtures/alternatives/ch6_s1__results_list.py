# Three functions that work together
def calc_attack(level):
    return level * 3

def calc_defense(level):
    return level * 2 + 5

def power_rating(level):
    return calc_attack(level) + calc_defense(level)

ratings = []
for level in [1, 5, 10]:
    ratings.append(power_rating(level))
for rating in ratings:
    print(rating)
