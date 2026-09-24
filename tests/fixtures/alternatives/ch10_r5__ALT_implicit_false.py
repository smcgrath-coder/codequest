# RPG State System
player = {
    "name": "Hero",
    "hp": 100,
    "attack": 15,
    "inventory": [],
    "gold": 0
}

# Functions
def take_damage(state, amount):
    state["hp"] -= amount
    print(f"Ouch! {state['name']} lost {amount} HP.")
    print(f"HP is now {state['hp']}")
    if state["hp"] > 0:
        return True

def find_loot(state, item, gold):
    state["inventory"].append(item)
    state["gold"] = state["gold"] + gold
    print(f"You found a {item} and {gold} gold coins!")

def show_status(state):
    for key, value in state.items():
        print(f"{key}: {value}")

# Simulate gameplay
take_damage(player, 30)
find_loot(player, "Iron Sword", 50)
take_damage(player, 25)
show_status(player)
