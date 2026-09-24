player = {
    "name": "Hero",
    "hp": 100,
    "attack": 15,
    "inventory": [],
    "gold": 0
}

def take_damage(state, amount):
    state["hp"] -= amount
    print(f"{state['name']} took {amount} damage! HP: {state['hp']}")
    return state["hp"] > 0

def find_loot(state, item, gold):
    state["inventory"].append(item)
    state["gold"] += gold
    print(f"Found {item} and {gold} gold!")

def show_status(state):
    print("=== Status ===")
    print(f"Name: {player['name']}")
    print(f"HP: {player['hp']}")
    print(f"Attack: {player['attack']}")
    print(f"Inventory: {player['inventory']}")
    print(f"Gold: {player['gold']}")

take_damage(player, 30)
find_loot(player, "Iron Sword", 50)
take_damage(player, 25)
show_status(player)
