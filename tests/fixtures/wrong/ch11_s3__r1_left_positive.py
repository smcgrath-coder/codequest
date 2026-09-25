heading = 0

def turn(heading, angle):
    return (heading + angle) % 360

for angle in [90, 90, 45, 180, 270]:
    heading = turn(heading, angle)
    print("Heading:", heading)
print("Final heading:", heading)
