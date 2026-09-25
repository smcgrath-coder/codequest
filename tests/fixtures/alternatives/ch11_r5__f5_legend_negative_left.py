def launch():
    print("Reset gyro")
    print("Reset arms")
    print("🟡 Ready!")

def end_run():
    print("🟢 Run complete!")

def straight(d):
    print(f"Drive {d}mm")

def turn(a):
    print(f"Turn {a}°")
    print("  (negative means left)")

def right_arm(d):
    print(f"Right arm {d}°")

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
