has_sword = True
monster_health = 30

if not has_sword:
    print("You need a weapon!")
else:
    if monster_health > 50:
        print("Tough fight!")
    else:
        print("Easy win!")
