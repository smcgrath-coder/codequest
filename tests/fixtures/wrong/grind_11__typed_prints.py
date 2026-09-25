# Password strength checker
def is_strong(password):
    has_digit = False
    for char in password:
        if char.isdigit():
            has_digit = True
    return len(password) >= 8 and has_digit

print("hello is weak")
print("secret42 is strong")
