# Password strength checker
def is_strong(password):
    has_digit = False
    for ch in password:
        if ch.isdigit():
            has_digit = True
    return len(password) >= 8 and has_digit

for pw in ["hello", "secret42"]:
    if is_strong(pw):
        print(pw, "is a good password")
    else:
        print(pw, "is a bad password")
