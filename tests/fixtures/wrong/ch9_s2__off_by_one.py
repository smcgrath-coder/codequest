# Countdown function
def countdown(n):
    for i in range(n, 1, -1):
        print(i)
    print("🚀 BLAST OFF!")
    return "launched"

result = countdown(5)
print(result)
