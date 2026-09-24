def launch():
    print("Resetting gyro...")
    print("Resetting arms...")
    print("🟡 Ready!")

def end_run():
    print("🟢 Run complete!")

def straight(distance):
    print(f"Driving {abs(distance)}mm {'forward' if distance > 0 else 'backward'}")

def turn(angle):
    print(f"Turning {abs(angle)}° {'right' if angle > 0 else 'left'}")

def right_arm(degrees, speed=600):
    print(f"Right arm: {degrees}° at speed {speed}")

def Run1():
    launch()
    print("Speed: fast")
    straight(690)
    turn(45)
    straight(130)
    turn(-90)
    straight(90)
    right_arm(-240)
    end_run()

Run1()
print("Go Donut Sharks! 🦈")
