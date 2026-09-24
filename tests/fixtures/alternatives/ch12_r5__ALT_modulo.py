# Competition Menu System
current_program = 1
max_programs = 4

buttons = ["right", "right", "center", "center", "left", "center", "center"]

# Functions
def show_menu(num):
    print("=== Program " + str(num) + " ===")

def run_program(num):
    print("Launching Run " + str(num) + "...")
    print("Run " + str(num) + " complete!")

# Process button presses
for button in buttons:
    if button == "right":
        current_program = current_program % max_programs + 1
    elif button == "left":
        current_program = (current_program - 2) % max_programs + 1
    elif button == "center":
        run_program(current_program)
        current_program = current_program % max_programs + 1
    show_menu(current_program)
