player = {
    "name": "Hero",
    "hp": 100,
    "attack": 15,
    "inventory": [],
    "gold": 0
}

def take_damage(state, amount):
    state["hp"] -= amount
    print(f"Ouch! HP is now {state['hp']}")
    return state["hp"] > 0

def show_status(state):
    for key in state:
        print(key, ":", state[key])

def find_loot(state, item, gold):
    state["inventory"].append(item)
    state["gold"] = gold
    print(f"Found {item} and {gold} gold!")

take_damage(player, 30)
find_loot(player, "Iron Sword", 50)
take_damage(player, 25)
show_status(player)
