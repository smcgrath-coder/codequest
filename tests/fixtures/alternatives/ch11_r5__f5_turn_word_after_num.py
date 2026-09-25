def launch():
    print("Resetting gyro...")
    print("Resetting arms...")
    print("🟡 Ready!")

def end_run():
    print("🟢 Run complete!")

def straight(d):
    print(f"Straight: {d} mm")

def turn(a):
    side = "right" if a > 0 else "left"
    print(f"Turn: {abs(a)} degrees")
    print(f"({side})")

def Run1():
    launch()
    straight(690)
    turn(45)
    straight(130)
    turn(-90)
    straight(90)
    print("Right arm: -240 degrees")
    end_run()

Run1()
