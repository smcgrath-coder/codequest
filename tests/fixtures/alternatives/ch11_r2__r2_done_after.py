total_distance = 0

def robot_straight(distance):
    direction = "forward" if distance > 0 else "backward"
    print(f"Driving {abs(distance)}mm {direction}")
    return abs(distance)

def robot_turn(angle):
    direction = "right" if angle > 0 else "left"
    print(f"Turning {abs(angle)}° {direction}")

total_distance += robot_straight(200)
robot_turn(90)
total_distance += robot_straight(150)
robot_turn(-45)
total_distance += robot_straight(-100)

print(f"Total distance: {total_distance}mm")
print("Course complete! 🏁")
