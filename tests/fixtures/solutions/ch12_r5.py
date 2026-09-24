# Competition Menu System
current_program = 1
max_programs = 4

buttons = ["right", "right", "center", "center", "left", "center", "center"]

# Functions
def show_menu(num):
    print(f"=== Program {num} ===")

def run_program(num):
    print(f"🚀 Launching Run {num}...")
    print(f"✅ Run {num} complete!")

# Process button presses
for button in buttons:
    if button == "left":
        current_program -= 1
        if current_program < 1:
            current_program = max_programs
    elif button == "right":
        current_program += 1
        if current_program > max_programs:
            current_program = 1
    elif button == "center":
        run_program(current_program)
        current_program += 1
        if current_program > max_programs:
            current_program = 1
    show_menu(current_program)
