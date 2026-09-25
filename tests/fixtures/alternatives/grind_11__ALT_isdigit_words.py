# Password strength checker
def is_strong(password):
    if len(password) < 8:
        return False
    for ch in password:
        if ch.isdigit():
            return True
    return False

for pw in ["hello", "secret42"]:
    if is_strong(pw):
        print(pw, "is strong")
    else:
        print(pw, "is weak")
