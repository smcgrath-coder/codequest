choices = ["left", "fight"]

# Scene functions
def scene_start():
    print("You stand at a fork in the path. Do you go left or right?")
    return choices[0]

def scene_left():
    print("You enter a dark cave. A troll blocks the way! Do you fight or sneak?")
    return choices[1]

def scene_right():
    print("You walk into a sunny forest and spot an old chest under a tree.")
    return "treasure found!"

# Run the adventure
choice = scene_start()
action = scene_left()
outcome = scene_right()
print(f"You chose {choice}, then {action}.")
print(outcome)
