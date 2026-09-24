items = [
    {"name":"Sword","price":50},
    {"name":"Shield","price":30},
    {"name":"Potion","price":10}
]
player_gold = 100

def buy(items, name, gold):
    for item in items:
        if item["name"] == name:
            if item["price"] <= gold:
                return gold - item["price"]
            return -1

player_gold = buy(items, "Sword", player_gold)
print("Gold:", player_gold)
player_gold = buy(items, "Potion", player_gold)
print("Gold:", player_gold)
player_gold = buy(items, "Shield", player_gold)
print("Gold:", player_gold)
