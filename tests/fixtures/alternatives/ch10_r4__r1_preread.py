choices = ["left", "fight"]
first_choice = choices[0]
second_choice = choices[1]

def scene_start():
    print("You stand at the edge of a dark forest. Two paths split here.")
    return first_choice

def scene_left():
    print("The left path leads into a cave. A dragon is sleeping inside!")
    return second_choice

def scene_right():
    print("The right path leads to a sunny meadow.")
    return "treasure found!"

path = scene_start()
if path == "left":
    action = scene_left()
    if action == "fight":
        print("You fight the dragon and win!")
    else:
        print("You sneak past the dragon and escape!")
else:
    print(scene_right())
