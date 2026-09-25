# Competition Run — Full Mission

# Speed profiles
SPEED_FAST = {"straight": 600, "turn": 350}
SPEED_NORMAL = {"straight": 350, "turn": 250}

# Helper functions
def apply_speed(profile):
    print(f"Speed set: straight={profile['straight']}, turn={profile['turn']}")

def launch():
    print("Resetting gyro...")
    print("Resetting arms...")
    print("🟡 Ready!")

def end_run():
    print("🟢 Run complete!")

def right_arm(degrees, speed=600):
    print(f"Right arm: {degrees}° at speed {speed}")

def left_arm(degrees, speed=600):
    print(f"Left arm: {degrees}° at speed {speed}")

def straight(distance):
    if distance > 0:
        print(f"Moving forward {distance} mm")
    else:
        print(f"Backing up {-distance} mm (reverse)")

def turn(angle):
    direction = "right" if angle > 0 else "left"
    print(f"Turning {abs(angle)}° {direction}")

# Run1 — Full mission
def Run1():
    launch()
    apply_speed(SPEED_FAST)
    straight(690)
    turn(45)
    straight(130)
    turn(-90)
    straight(90)
    right_arm(-240)  # grab
    apply_speed(SPEED_NORMAL)
    straight(-350)
    end_run()

# Go!
Run1()
