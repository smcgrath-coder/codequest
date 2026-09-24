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
print(f"Hub: {hub['name']} (top side: {hub['top_side']}, front side: {hub['front_side']})")
print(f"Left motor: port {left_motor['port']}, {left_motor['direction']}")
print(f"Right motor: port {right_motor['port']}, {right_motor['direction']}")
print(f"Drive base: left port {drive_base['left']['port']}, right port {drive_base['right']['port']}")
print(f"Wheel diameter: {drive_base['wheel_diameter']}mm, axle track: {drive_base['axle_track']}mm")
