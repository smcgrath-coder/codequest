SPEED_FAST = {"straight": 600, "turn": 300}
SPEED_NORMAL = {"straight": 400, "turn": 200}

def apply_speed(profile):
    print("Speeds ->", profile["straight"], "mm/s,", profile["turn"], "deg/s")

def launch():
    print("Gyro reset, arms reset")
    print("Ready to go!")

def end_run():
    print("Motors stopped. Run done!")

def right_arm(degrees, speed=600):
    print("Right arm", degrees, "at", speed)

def left_arm(degrees, speed=600):
    print("Left arm", degrees, "at", speed)

def straight(mm):
    print("Straight:", mm, "mm")

def turn(deg):
    print("Turn:", deg, "deg")

def Run1():
    launch()
    apply_speed(SPEED_FAST)
    straight(690)
    turn(45)
    straight(130)
    turn(90)
    straight(90)
    right_arm(-240)
    apply_speed(SPEED_NORMAL)
    straight(-350)
    end_run()

Run1()
