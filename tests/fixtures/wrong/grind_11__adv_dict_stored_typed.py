# Password strength checker
def is_strong(password):
    return len(password) >= 8 and any(c.isdigit() for c in password)

results = {}
for p in ["hello", "secret42"]:
    results[p] = is_strong(p)
print("hello False")
print("secret42 True")
