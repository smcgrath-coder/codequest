# Complete Competition Program
BLACK_LINE = 22

# Speed profiles
SPEED_FAST = {"straight": 500, "turn": 300}
SPEED_SLOW = {"straight": 100, "turn": 80}

# Helper functions
def apply_speed(profile):
    print("Speed:", profile["straight"], "/", profile["turn"])

def launch():
    print("Ready!")

def end_run():
    print("Finished!")

def right_arm(deg, speed=600):
    print("Right arm", deg, "at", speed)

def left_arm(deg, speed=600):
    print("Left arm", deg, "at", speed)

# square_on_line
def square_on_line(approach_data, align_data):
    print("Phase 1")
    for left, right in approach_data:
        if left < BLACK_LINE or right < BLACK_LINE:
            break
        print("  driving forward")
    print("Phase 2")
    for left, right in align_data:
        if left < BLACK_LINE and right < BLACK_LINE:
            print("  aligned!")
            break
        elif left < BLACK_LINE:
            print("  turn right")
        else:
            print("  turn left")

# Runs
def Run1():
    launch()
    apply_speed(SPEED_FAST)
    print("Drive 400")
    print("Turn 90")
    print("Drive 150")
    right_arm(-180)
    end_run()

def Run2():
    launch()
    apply_speed(SPEED_SLOW)
    square_on_line(approach, align)
    print("Drive 100")
    print("Turn -90")
    end_run()

# Menu
buttons = ["center", "right", "center"]
current_program = 1

approach = [(80,80),(60,70),(18,50)]
align = [(18,50),(18,20),(14,12)]

for button in buttons:
    if button == "right":
        current_program += 1
    elif button == "left":
        current_program -= 1
    elif button == "center":
        if current_program == 1:
            Run1()
        elif current_program == 2:
            Run2()
        else:
            print("Run", current_program, "not implemented")
        current_program += 1
    if current_program > 3:
        current_program = 1
    if current_program < 1:
        current_program = 3
    print("Menu: Program", current_program)
