def launch():
    print("Resetting gyro...")
    print("Resetting arms...")
    print("🟡 Ready!")

def end_run():
    print("🟢 Run complete!")

def straight(distance):
    direction = "forward" if distance > 0 else "backward"
    print(f"Driving {abs(distance)}mm {direction}")

def turn(angle):
    print(f"Turn {abs(angle)}° {'clockwise' if angle > 0 else 'counterclockwise'}")

def right_arm(degrees):
    print(f"Right arm: {degrees}°")

def Run1():
    launch()
    straight(690)
    turn(45)
    straight(130)
    turn(-90)
    straight(90)
    right_arm(-240)
    end_run()

Run1()
