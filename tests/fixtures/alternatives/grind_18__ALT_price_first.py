# Shop system
items = [
    {"name":"Sword","price":50},
    {"name":"Shield","price":30},
    {"name":"Potion","price":10}
]
player_gold = 100

def buy(items, name, gold):
    price = 0
    for item in items:
        if item["name"] == name:
            price = item["price"]
    if price > gold:
        return -1
    return gold - price

for name in ["Sword", "Potion", "Shield"]:
    left = buy(items, name, player_gold)
    if left == -1:
        print("Not enough gold for", name)
    else:
        player_gold = left
        print("Gold after", name + ":", player_gold)
