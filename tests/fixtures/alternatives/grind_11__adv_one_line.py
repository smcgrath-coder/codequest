def is_strong(password):
    has_digit = False
    for ch in password:
        if ch.isdigit():
            has_digit = True
    return len(password) >= 8 and has_digit


print(is_strong("hello"), is_strong("secret42"))
