hub = {"name": "PrimeHub", "top_side": "Z", "front_side": "Y"}
left_motor = {"port": "D", "direction": "counterclockwise"}
right_motor = {"port": "C", "direction": "clockwise"}
drive_base = {"left": left_motor, "right": right_motor, "wheel_diameter": 62.4, "axle_track": 80}

print("Hub:", hub["name"])
print("  Top side:", hub["top_side"])
print("  Front side:", hub["front_side"])
print("Left motor:")
print("  Port:", left_motor["port"])
print("  Direction:", right_motor["direction"])
print("Right motor:")
print("  Port:", right_motor["port"])
print("  Direction:", left_motor["direction"])
print("Wheel diameter:", drive_base["wheel_diameter"])
print("Axle track:", drive_base["axle_track"])
