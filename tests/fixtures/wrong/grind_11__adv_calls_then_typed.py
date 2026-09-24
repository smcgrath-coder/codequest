def is_strong(password):
    has_digit = False
    for ch in password:
        if ch.isdigit():
            has_digit = True
    return len(password) >= 8 and has_digit


is_strong("hello")
is_strong("secret42")
print("hello is weak")
print("secret42 is strong")
