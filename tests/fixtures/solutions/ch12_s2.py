# Mission Timer
MATCH_TIME = 150
run_times = [28, 35, 42, 31]

def format_time(seconds):
    return f"{seconds // 60}:{seconds % 60:02d}"

def can_fit_run(time_left, run_time, buffer=5):
    return time_left >= run_time + buffer

time_left = MATCH_TIME

for i, run_time in enumerate(run_times):
    if can_fit_run(time_left, run_time):
        time_left -= run_time
        print(f"Run {i + 1} ({format_time(run_time)}) fits! Time left: {format_time(time_left)}")
    else:
        print(f"Run {i + 1} ({format_time(run_time)}) does not fit! Skipping.")

time_used = MATCH_TIME - time_left
print(f"Total time used: {format_time(time_used)}")
print(f"Time remaining: {format_time(time_left)}")
