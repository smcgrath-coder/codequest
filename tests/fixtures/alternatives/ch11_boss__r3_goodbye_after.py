SPEED_FAST = {"straight": 600, "turn": 350}
SPEED_NORMAL = {"straight": 400, "turn": 250}

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
    print(f"Driving {abs(distance)}mm {'forward' if distance > 0 else 'backward'}")

def turn(angle):
    print(f"Turning {abs(angle)}° {'right' if angle > 0 else 'left'}")

def Run1():
    launch()
    apply_speed(SPEED_FAST)
    straight(690)
    turn(45)
    straight(130)
    turn(-90)
    straight(90)
    right_arm(-240)
    apply_speed(SPEED_NORMAL)
    straight(-350)
    end_run()

Run1()
print("Good luck at the competition! 🏆")
