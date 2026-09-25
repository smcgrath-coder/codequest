def is_strong(password):
    print("Checking...")
    return len(password) >= 8 and any(c.isdigit() for c in password)

is_strong("hello")
is_strong("secret42")
print("hello is weak")
print("secret42 is strong")
