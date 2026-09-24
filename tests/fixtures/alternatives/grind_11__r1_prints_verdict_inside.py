def is_strong(password):
    strong = len(password) >= 8 and any(c.isdigit() for c in password)
    if strong:
        print(password, "is strong")
    else:
        print(password, "is weak")
    return strong

is_strong("hello")
is_strong("secret42")
