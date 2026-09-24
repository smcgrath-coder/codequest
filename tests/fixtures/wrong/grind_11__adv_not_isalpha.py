# Password strength checker
def is_strong(password):
    return len(password) >= 8 and not password.isalpha()

print(is_strong("hello"))
print(is_strong("secret42"))
