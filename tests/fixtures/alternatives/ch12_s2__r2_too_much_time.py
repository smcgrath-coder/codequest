MATCH_TIME = 150
run_times = [28, 35, 42, 31]

def format_time(seconds):
    return f"{seconds // 60}:{seconds % 60:02d}"

def can_fit_run(time_left, run_time, buffer=5):
    return run_time + buffer <= time_left

time_left = MATCH_TIME
for n, rt in enumerate(run_times, 1):
    if can_fit_run(time_left, rt):
        time_left -= rt
        print(f"Run {n} OK - {format_time(time_left)} left")
    else:
        print(f"Run {n} would take too much time")
print("Time used:", format_time(MATCH_TIME - time_left))
print("Time remaining:", format_time(time_left))
