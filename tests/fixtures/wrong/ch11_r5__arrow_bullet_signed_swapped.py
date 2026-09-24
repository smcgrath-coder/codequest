def launch():
    print("Resetting gyro...")
    print("Resetting arms...")
    print("🟡 Ready!")

def end_run():
    print("🟢 Run complete!")

def drive(distance):
    print(f"➡️ Driving {distance}mm")

def turn(angle):
    print(f"➡️ Turning {angle}°")

def Run1():
    launch()
    drive(690)
    turn(-45)
    drive(130)
    turn(90)
    drive(90)
    print("Right arm: -240°")
    end_run()

Run1()
