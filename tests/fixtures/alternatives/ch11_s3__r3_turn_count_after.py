# Heading Tracker
heading = 0

def turn(heading, angle):
    return (heading + angle) % 360

moves = [("right", 90), ("right", 90), ("left", 45), ("right", 180), ("left", 270)]
for side, amount in moves:
    if side == "left":
        amount = -amount
    heading = turn(heading, amount)
    print(f"Turn {side} {abs(amount)}° -> now facing {heading}°")

print(f"Final heading: {heading}°")
print(f"That was {len(moves)} turns!")
