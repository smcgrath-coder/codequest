choices = ["left", "fight"]

# Scene functions
def scene_start():
    print("You wake up in a forest clearing. Paths lead left and right.")
    return choices[0]

def scene_left():
    print("The left path leads into a spooky cave. A bat swoops down!")
    return choices[1]

def scene_right():
    print("The right path opens into a meadow full of flowers.")
    return "treasure found!"

# Run the adventure
first = scene_start()
if first == "left":
    second = scene_left()
    if second == "fight":
        print("You swing your stick and scare the bat away. The end!")
    else:
        print("You tiptoe past the bat and find the exit. The end!")
else:
    print(scene_right())
