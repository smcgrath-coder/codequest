# Heading Tracker
heading = 0

def turn(heading, angle):
    return (heading + angle) % 360

heading = turn(heading, 90)
print("Heading:", heading)
heading = turn(heading, 90)
print("Heading:", heading)
heading = turn(heading, -45)
print("Heading:", heading)
heading = turn(heading, 180)
print("Heading:", heading)
heading = turn(heading, -270)
print("Heading:", heading)
print("Final heading:", heading)
