# Password strength checker

def is_strong(password):
    has_digit = False
    for char in password:
        if char in "0123456789":
            has_digit = True
    return len(password) >= 8 and has_digit

print(is_strong("hello"))
print(is_strong("secret42"))
