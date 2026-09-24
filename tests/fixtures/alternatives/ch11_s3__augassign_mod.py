# Heading Tracker
heading = 0

def turn(heading, angle):
    new = heading + angle
    new %= 360
    return new

heading = turn(heading, 90)
print("After turning right 90:", heading)
heading = turn(heading, 90)
print("After turning right 90:", heading)
heading = turn(heading, -45)
print("After turning left 45:", heading)
heading = turn(heading, 180)
print("After turning right 180:", heading)
heading = turn(heading, -270)
print("After turning left 270:", heading)
print("Final heading:", heading)
