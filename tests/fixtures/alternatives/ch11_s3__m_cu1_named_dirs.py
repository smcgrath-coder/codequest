heading = 0

def turn(heading, angle):
    heading += angle
    heading %= 360
    return heading

plan = [("right", 90), ("right", 90), ("left", 45), ("right", 180), ("left", 270)]
for side, amount in plan:
    heading = turn(heading, amount if side == "right" else -amount)
    print(side.upper(), amount, "=>", heading)
print("FINAL:", heading)
