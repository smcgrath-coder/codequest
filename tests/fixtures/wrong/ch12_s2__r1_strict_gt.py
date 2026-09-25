MATCH_TIME = 150
run_times = [28, 35, 42, 31]

def format_time(seconds):
    return f"{seconds // 60}:{seconds % 60:02d}"

def can_fit_run(time_left, run_time, buffer=5):
    return time_left > run_time + buffer

time_left = MATCH_TIME
for i, rt in enumerate(run_times):
    if can_fit_run(time_left, rt):
        time_left -= rt
        print(f"Run {i + 1} fits! Time left: {format_time(time_left)}")
    else:
        print(f"Run {i + 1} does not fit!")
print("Total used:", format_time(MATCH_TIME - time_left))
print("Remaining:", format_time(time_left))
