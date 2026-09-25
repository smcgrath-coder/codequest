def launch():
    print("Resetting gyro...")
    print("Resetting arms...")
    print("Ready!")

def end_run():
    print("Run complete!")

def right_arm(degrees):
    print(f"Right arm to {degrees} degrees")

def drive(mm):
    print(f"Drive forward {mm}mm")
def turn(deg, side):
    a = -deg if side == "right" else deg
    print(f"Turn {a}°")
    print("  left wheel forward, right wheel back" if a > 0 else "  right wheel forward, left wheel back")

def Run1():
    launch()
    drive(690)
    turn(45, "right")
    drive(130)
    turn(90, "left")
    drive(90)
    right_arm(-240)
    end_run()

Run1()
