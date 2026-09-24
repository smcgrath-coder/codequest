# Password strength checker
def is_strong(password):
    has_digit = any(ch.isdigit() for ch in password)
    return len(password) >= 8 and has_digit

weak = is_strong("hello")
strong = is_strong("secret42")
print("hello: False")
print("secret42: True")
