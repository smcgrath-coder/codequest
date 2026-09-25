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

def forward(distance):
    print(f"Driving {distance}mm forward")

def backward(distance):
    print(f"Driving {distance}mm backward")

def turn_right(deg):
    print(f"Turning {deg}°")

def turn_left(deg):
    print(f"Turning {deg}°")

# Run1 — Full mission
def Run1():
    launch()
    apply_speed(SPEED_FAST)
    forward(690)
    turn_right(45)
    forward(130)
    turn_left(90)
    forward(90)
    right_arm(-240)  # grab
    apply_speed(SPEED_NORMAL)
    backward(350)
    end_run()

# Go!
Run1()
