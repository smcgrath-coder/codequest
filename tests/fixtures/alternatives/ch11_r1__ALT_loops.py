# Robot Hardware Blueprint
# (Simulating Pybricks setup with dicts)

# 1. Hub
hub = {"name": "PrimeHub", "top_side": "Z", "front_side": "Y"}

# 2. Motors
left_motor = {"port": "D", "direction": "counterclockwise"}
right_motor = {"port": "C", "direction": "clockwise"}

# 3. Drive Base
drive_base = {"left": left_motor, "right": right_motor, "wheel_diameter": 62.4, "axle_track": 80}

# 4. Print the blueprint
print("HUB")
for key, value in hub.items():
    print("  " + key + " = " + str(value))
print("LEFT MOTOR")
for key in left_motor:
    print("  " + key + " = " + left_motor[key])
print("RIGHT MOTOR")
for key in right_motor:
    print("  " + key + " = " + right_motor[key])
print("DRIVE BASE")
print("  wheel_diameter =", drive_base["wheel_diameter"])
print("  axle_track =", drive_base["axle_track"])
