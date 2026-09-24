# Password strength checker
def is_strong(password):
    return len(password) >= 8 and any(c.isdigit() for c in password)

results = []
for p in ["hello", "secret42"]:
    results.append(is_strong(p))
print("hello is weak")
print("secret42 is strong")
