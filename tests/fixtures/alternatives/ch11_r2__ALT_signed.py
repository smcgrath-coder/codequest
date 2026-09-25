# Robot Movement Simulator
total_distance = 0

# Movement functions
def robot_straight(distance):
    global total_distance
    if distance >= 0:
        print(f"Driving {distance}mm forward")
    else:
        print(f"Driving {distance}mm backward")
    total_distance += abs(distance)

def robot_turn(angle):
    if angle >= 0:
        print(f"Turning {angle} degrees right")
    else:
        print(f"Turning {angle} degrees left")

# Navigate the course
robot_straight(200)
robot_turn(90)
robot_straight(150)
robot_turn(-45)
robot_straight(-100)
print("Total distance:", total_distance, "mm")
