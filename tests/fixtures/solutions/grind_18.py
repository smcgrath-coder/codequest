# Shop system
items = [
    {"name":"Sword","price":50},
    {"name":"Shield","price":30},
    {"name":"Potion","price":10}
]
player_gold = 100

def buy(items, name, gold):
    for item in items:
        if item["name"] == name:
            if gold >= item["price"]:
                return gold - item["price"]
            else:
                return -1

for name in ["Sword", "Potion", "Shield"]:
    result = buy(items, name, player_gold)
    if result == -1:
        print(f"Can't afford {name}!")
    else:
        player_gold = result
        print(f"Bought {name}! Gold left: {player_gold}")
