hub = {"name": "PrimeHub", "top_side": "Z", "front_side": "Y"}
left_motor = {"port": "D", "direction": "counterclockwise"}
right_motor = {"port": "C", "direction": "clockwise"}
drive_base = {"left": left_motor, "right": right_motor, "wheel_diameter": 62.4, "axle_track": 80}

print(f"Hub: {hub['name']}, top {hub['top_side']}, front {hub['front_side']}")
print(f"Left motor: port {right_motor['port']}, {right_motor['direction']}")
print(f"Right motor: port {left_motor['port']}, {left_motor['direction']}")
print(f"Wheels: {drive_base['wheel_diameter']}mm, axle {drive_base['axle_track']}mm")
