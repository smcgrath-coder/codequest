age = 12
has_permission = True

allowed = age >= 13 or has_permission
if allowed:
    print("Access granted")
else:
    print("Access denied")
