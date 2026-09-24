# Password strength checker
def is_strong(password):
    has_digit = False
    for char in password:
        if char.isdigit():
            has_digit = True
    return len(password) >= 8 or has_digit

print(is_strong("hello"))
print(is_strong("secret42"))
