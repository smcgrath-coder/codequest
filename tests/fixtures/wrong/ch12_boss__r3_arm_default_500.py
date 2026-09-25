BLACK_LINE = 22
SPEED_FAST = {"straight": 600, "turn": 350}
SPEED_SLOW = {"straight": 150, "turn": 100}

def apply_speed(profile):
    print(f"Speed set: straight={profile['straight']}, turn={profile['turn']}")

def launch():
    print("Resetting gyro...")
    print("🟡 Ready!")

def end_run():
    print("🟢 Run complete!")

def straight(d):
    print(f"Driving {abs(d)}mm {'forward' if d > 0 else 'backward'}")

def turn(a):
    print(f"Turning {abs(a)}° {'right' if a > 0 else 'left'}")

def right_arm(deg, speed=500):
    print(f"Right arm: {deg}° at speed {speed}")

def left_arm(deg, speed=500):
    print(f"Left arm: {deg}° at speed {speed}")

def square_on_line(approach_data, align_data):
    print("Phase 1")
    for l, r in approach_data:
        if l < BLACK_LINE or r < BLACK_LINE:
            print(f"Line found! {l}, {r}")
            break
        print(f"Driving... {l}, {r}")
    print("Phase 2")
    for l, r in align_data:
        if l < BLACK_LINE and r < BLACK_LINE:
            print(f"{l}, {r} -> aligned")
            print("✅ Squared on line!")
            break
        elif l < BLACK_LINE:
            print(f"{l}, {r} -> turn_right")
        else:
            print(f"{l}, {r} -> turn_left")

def Run1():
    launch()
    apply_speed(SPEED_FAST)
    straight(500)
    turn(90)
    straight(200)
    left_arm(90)
    end_run()

def Run2():
    launch()
    apply_speed(SPEED_SLOW)
    square_on_line(approach, align)
    straight(100)
    turn(-90)
    end_run()

buttons = ["center", "right", "center"]
current_program = 1

approach = [(80,80),(60,70),(18,50)]
align = [(18,50),(18,20),(14,12)]

for button in buttons:
    if button == "right":
        current_program = current_program % 3 + 1
    elif button == "center":
        if current_program == 1:
            Run1()
        elif current_program == 2:
            Run2()
        else:
            print(f"Run {current_program} not implemented")
        current_program = current_program % 3 + 1
    print(f"=== Program {current_program} ===")
