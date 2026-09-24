# Mission Timer
MATCH_TIME = 150
run_times = [28, 35, 42, 31]

def format_time(seconds):
    return f"{seconds // 60}:{seconds % 60:02d}"

def can_fit_run(time_left, run_time, buffer=5):
    return time_left >= run_time + buffer

time_left = MATCH_TIME
for number, rt in enumerate(run_times, start=1):
    if can_fit_run(time_left, rt):
        time_left = time_left - rt
        print(f"Run {number} ({format_time(rt)}): ✅  time left {format_time(time_left)}")
    else:
        print(f"Run {number} ({format_time(rt)}): ❌")
print(f"Used: {format_time(MATCH_TIME - time_left)}  Left: {format_time(time_left)}")
