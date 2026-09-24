score = 100

def my_function():
    score = 50
    print(f"Local score: {score}")

my_function()
print(f"Global score: {score}")
print("See? They're independent!")
