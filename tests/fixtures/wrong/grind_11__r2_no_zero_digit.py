def is_strong(password):
    has_digit = False
    for ch in password:
        if ch in "123456789":
            has_digit = True
    return len(password) >= 8 and has_digit

print(is_strong("hello"))
print(is_strong("secret42"))
