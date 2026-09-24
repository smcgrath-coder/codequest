choices = ["left", "fight"]

# Scene functions
def scene_start():
    print("You stand at a fork in the path. Do you go left or right?")
    return choices.pop(0)

def scene_left():
    print("You enter a dark cave. A troll blocks the way! Do you fight or sneak?")
    return choices.pop(0)

def scene_right():
    print("You walk into a sunny forest and spot an old chest under a tree.")
    return "treasure found!"

# Run the adventure
choice = scene_start()
print(f"You chose: {choice}")

if choice == "left":
    action = scene_left()
    print(f"You chose: {action}")
    if action == "fight":
        print("You fight the troll and win! 🏆 Victory!")
    else:
        print("You sneak past the troll and escape the cave!")
else:
    outcome = scene_right()
    print(outcome)
