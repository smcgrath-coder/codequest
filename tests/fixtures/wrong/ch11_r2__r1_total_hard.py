total_distance = 0

def robot_straight(distance):
    direction = "forward" if distance > 0 else "backward"
    print(f"Driving {abs(distance)}mm {direction}")

def robot_turn(angle):
    direction = "right" if angle > 0 else "left"
    print(f"Turning {abs(angle)}° {direction}")

robot_straight(200)
robot_turn(90)
robot_straight(150)
robot_turn(-45)
robot_straight(-100)
total_distance = 200 + 150 + 100
print(f"Total distance: {total_distance}mm")
