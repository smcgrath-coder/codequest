def launch():
    print("Resetting gyro...")
    print("Resetting arms...")
    print("🟡 Ready!")

def end_run():
    print("🟢 Run complete!")

def right_arm(degrees):
    print(f"Right arm: {degrees}°")

def drive(mm):
    print(f"Driving forward {mm}mm")

def turn(direction, degrees):
    print(f"Turning {degrees}°")
    print(f"  Direction: {direction}")

def Run1():
    launch()
    drive(690)
    turn("right", 45)
    drive(130)
    turn("left", 90)
    drive(90)
    right_arm(-240)
    end_run()

Run1()
