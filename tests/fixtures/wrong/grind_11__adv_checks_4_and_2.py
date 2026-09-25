# Password strength checker
def is_strong(password):
    return len(password) >= 8 and ("4" in password or "2" in password)

print(is_strong("hello"))
print(is_strong("secret42"))
