choices = ["left", "fight"]

def scene_start():
    print("You stand at a fork in the road.")
    return choices[0]

def scene_left():
    print("You enter a dark, damp cave. A troll appears!")
    return choices[1]

def scene_right():
    print("You walk into a bright forest.")
    return "Treasure found!"

choice = scene_start()
if choice == "left":
    action = scene_left()
    if action == "fight":
        print("You fight the troll and win!")
    else:
        print("You sneak past the troll.")
else:
    print(scene_right())
