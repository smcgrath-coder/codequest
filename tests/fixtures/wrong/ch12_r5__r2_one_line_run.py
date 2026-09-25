current_program = 1
max_programs = 4

buttons = ["right", "right", "center", "center", "left", "center", "center"]

def show_menu(num):
    print(f"=== Program {num} ===")

def run_program(num):
    print(f"🚀 Launching Run {num}... ✅ Run {num} complete!")

for b in buttons:
    if b == "right":
        current_program = current_program % max_programs + 1
    elif b == "left":
        current_program = (current_program - 2) % max_programs + 1
    elif b == "center":
        run_program(current_program)
        current_program = current_program % max_programs + 1
    show_menu(current_program)
