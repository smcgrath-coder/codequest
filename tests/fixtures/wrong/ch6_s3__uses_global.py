# Show that local and global variables are separate
score = 100

def local_test():
    global score
    score = 50
    print(f"Local: {score}")

local_test()
print(f"Global: {score}")
