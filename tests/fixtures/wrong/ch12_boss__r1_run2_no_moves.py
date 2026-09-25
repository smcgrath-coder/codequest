BLACK_LINE = 22

SPEED_FAST = {"straight": 600, "turn": 350}
SPEED_SLOW = {"straight": 150, "turn": 100}

def apply_speed(profile):
    print(f"Speed set: straight={profile['straight']}, turn={profile['turn']}")

def launch():
    print("Resetting gyro and arms...")
    print("Ready!")

def end_run():
    print("Run complete!")

def right_arm(deg, speed=600):
    print(f"Right arm: {deg} at speed {speed}")

def left_arm(deg, speed=600):
    print(f"Left arm: {deg} at speed {speed}")

def straight(distance):
    print(f"Driving {distance}mm")

def turn(angle):
    print(f"Turning {angle} degrees")

def square_on_line(approach_data, align_data):
    print("Phase 1")
    for left, right in approach_data:
        if left < BLACK_LINE or right < BLACK_LINE:
            print(f"Line found! {left}, {right}")
            break
        print(f"Driving... {left}, {right}")
    print("Phase 2")
    for left, right in align_data:
        if left < BLACK_LINE and right < BLACK_LINE:
            print(f"{left}, {right} -> aligned")
            break
        elif left < BLACK_LINE:
            print(f"{left}, {right} -> turn_right")
        else:
            print(f"{left}, {right} -> turn_left")

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
    square_on_line(approach, align)
    end_run()
buttons = ["center", "right", "center"]
current_program = 1
max_programs = 3

approach = [(80,80),(60,70),(18,50)]
align = [(18,50),(18,20),(14,12)]

for button in buttons:
    if button == "right":
        current_program += 1
        if current_program > max_programs:
            current_program = 1
    elif button == "left":
        current_program -= 1
        if current_program < 1:
            current_program = max_programs
    elif button == "center":
        if current_program == 1:
            Run1()
        elif current_program == 2:
            Run2()
        else:
            print(f"Run {current_program} not implemented")
        current_program += 1
        if current_program > max_programs:
            current_program = 1
    print(f"=== Program {current_program} ===")

