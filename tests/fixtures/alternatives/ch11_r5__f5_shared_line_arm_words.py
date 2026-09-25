# Mission Framework

def launch():
    print("Resetting gyro and arms")
    print("🟡 Ready!")

def end_run():
    print("🟢 Run complete!")

def Run1():
    launch()
    print("Drive forward 690mm fast, then turn right 45°")
    print("Drive forward 130mm, then turn left 90°")
    print("Drive forward 90mm")
    print("Grabbing with the right arm")
    print("Right arm to -240°")
    end_run()

Run1()
