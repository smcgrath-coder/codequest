# Mission Timer
MATCH_TIME = 150
run_times = [28, 35, 42, 31]

def format_time(seconds):
    return f"{seconds // 60}:{seconds % 60:02d}"

def can_fit_run(time_left, run_time, buffer=5):
    return time_left >= run_time + buffer

time_left = MATCH_TIME
used = 0
for i, run_time in enumerate(run_times):
    if can_fit_run(time_left, run_time):
        print(f"Run {i + 1}: {format_time(run_time)} fits")
        used += run_time
    else:
        print(f"Run {i + 1}: {format_time(run_time)} doesn't fit")
    time_left -= run_time
print("Time used:", format_time(used))
print("Time left:", format_time(time_left))
