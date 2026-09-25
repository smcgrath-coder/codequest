total_distance = 0

def robot_straight(distance):
    global total_distance
    direction = "forward" if distance > 0 else "backward"
    print(f"driving {abs(distance)}mm {direction}")
    total_distance += abs(distance)

def robot_turn(angle):
    direction = "right" if angle > 0 else "left"
    print(f"turning {abs(angle)}° {direction}")

robot_straight(200)
robot_turn(90)
robot_straight(150)
robot_turn(-45)
robot_straight(-100)
print(f"Total distance: {total_distance}mm")
