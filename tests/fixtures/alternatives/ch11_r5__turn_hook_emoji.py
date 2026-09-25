def launch():
    print("Resetting gyro...")
    print("Resetting arms...")
    print("🟡 Ready!")

def end_run():
    print("🟢 Run complete!")

def drive(mm):
    print(f"🚗 Drive {mm}mm")

def turn(deg):
    icon = "↪️" if deg > 0 else "↩️"
    print(f"{icon} Turn {abs(deg)}°")

def right_arm(degrees):
    print(f"💪 Right arm: {degrees}°")

def Run1():
    launch()
    drive(690)
    turn(45)
    drive(130)
    turn(-90)
    drive(90)
    right_arm(-240)
    end_run()

Run1()
