# Heading Tracker
heading = 0

def turn(heading, angle):
    return heading + angle

for angle in [90, 90, -45, 180, -270]:
    heading = turn(heading, angle)
    print("Heading:", heading)

heading %= 360
print("Final heading:", heading)
