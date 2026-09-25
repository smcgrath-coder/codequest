def launch():
    print("Resetting gyro...")
    print("Resetting arms...")
    print("🟡 Ready!")
def end_run():
    print("🟢 Run complete!")
def Run1():
    launch()
    print("Drive 690mm fast")
    print("Turn 45° clockwise")
    print("Drive 130mm")
    print("Turn 90° clockwise")
    print("Drive 90mm")
    print("Right arm -240°")
    end_run()
Run1()
