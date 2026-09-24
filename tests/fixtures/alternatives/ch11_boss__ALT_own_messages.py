# Competition Run — Full Mission

# Speed profiles
SPEED_FAST = {"straight": 700, "turn": 300}
SPEED_NORMAL = {"straight": 400, "turn": 200}

# Helper functions
def apply_speed(profile):
    print("Setting speed to", profile["straight"], "mm/s and turn rate", profile["turn"])

def launch():
    print("Starting mission... gyro and arms reset")

def end_run():
    print("Mission finished!")

def right_arm(degrees, speed=600):
    print("Right arm moves", degrees, "at", speed)

def left_arm(degrees, speed=600):
    print("Left arm moves", degrees, "at", speed)

# Run1 — Full mission
def Run1():
    launch()
    apply_speed(SPEED_FAST)
    print("Forward 690 mm")
    print("Right turn 45")
    print("Forward 130 mm")
    print("Left turn 90")
    print("Forward 90 mm")
    right_arm(-240)
    apply_speed(SPEED_NORMAL)
    print("Backward 350 mm")
    end_run()

# Go!
Run1()
