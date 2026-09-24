def launch():
    print("Gyro reset to 0")
    print("Arms reset")
    print("🟡 Ready!")

def end_run():
    print("🟢 Run complete!")

def straight(mm):
    print(f"Straight {mm} mm")

def turn(degrees):
    print(f"Rotating {degrees} degrees")

def Run1():
    launch()
    straight(690)
    turn(-45)
    straight(130)
    turn(90)
    straight(90)
    print("Right arm grab: -240")
    end_run()

Run1()
