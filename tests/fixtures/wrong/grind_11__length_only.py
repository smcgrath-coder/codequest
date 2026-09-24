def is_strong(password):
    return len(password) >= 8

print(is_strong("hello"))
print(is_strong("secret42"))
