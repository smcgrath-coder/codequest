# Show that local and global variables are separate
score = 100
print("Global score before:", score)

def my_forge():
    score = 50
    print("Local score:", score)

my_forge()
print("Global score after:", score)
