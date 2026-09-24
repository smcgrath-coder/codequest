def countdown(n):
    for i in range(n, 0, -1):
        print(f"{i}...")
    print("🚀 BLAST OFF!")
    return "launched"

print(countdown(5))
