def is_strong(password):
    return len(password) >= 8 and any(c.isdigit() for c in password)
print(is_strong("abc"))
print(is_strong("password123"))
