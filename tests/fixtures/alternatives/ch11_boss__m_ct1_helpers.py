# Competition Run — Full Mission

# Speed profiles
SPEED_FAST = {"straight": 600, "turn": 350}
SPEED_NORMAL = {"straight": 400, "turn": 250}

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

def drive(distance):
    print(f"Driving {distance}mm")

def turn(angle):
    print(f"Turning {angle}°")

# Run1 — Full mission
def Run1():
    launch()
    apply_speed(SPEED_FAST)
    drive(690)
    turn(45)
    drive(130)
    turn(-90)
    drive(90)
    right_arm(-240)
    apply_speed(SPEED_NORMAL)
    drive(-350)
    end_run()

# Go!
Run1()
