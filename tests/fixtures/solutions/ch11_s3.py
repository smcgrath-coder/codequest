# Heading Tracker
heading = 0

def turn(heading, angle):
    new_heading = (heading + angle) % 360
    return new_heading

# Right is positive, left is negative
turns = [90, 90, -45, 180, -270]

for angle in turns:
    heading = turn(heading, angle)
    print(f"Turned {angle}° -> heading is now {heading}°")

print(f"Final heading: {heading}°")
