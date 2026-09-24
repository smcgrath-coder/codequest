# Show that local and global variables are separate
score = 100

def show_inside():
    score = 50
    print("Inside the function, score is", score)

show_inside()
print("Outside the function, score is", score)
