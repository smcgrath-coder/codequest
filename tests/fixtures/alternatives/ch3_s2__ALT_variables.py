age = 15
temp = 100
lives = 0

status = "minor" if age < 18 else "adult"
water = "boiling" if temp >= 100 else "not yet"
game = "game over" if lives == 0 else "keep going"
print(status)
print(water)
print(game)
