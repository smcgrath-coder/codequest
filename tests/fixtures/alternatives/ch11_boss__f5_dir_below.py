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
    direction = "forward" if distance > 0 else "backward"
    print(f"Driving {abs(distance)}mm {direction}")

def turn(direction, degrees):
    print(f"Turning {degrees}°")
    print(f"  Direction: {direction}")

def Run1():
    launch()
    apply_speed(SPEED_FAST)
    straight(690)
    turn("right", 45)
    straight(130)
    turn("left", 90)
    straight(90)
    right_arm(-240)
    apply_speed(SPEED_NORMAL)
    straight(-350)
    end_run()

Run1()
