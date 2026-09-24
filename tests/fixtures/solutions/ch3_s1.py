# Test each value
values_to_test = [0, "", "hello", 42, None]

value = 0
if value:
    print("truthy")
else:
    print("falsy")

value = ""
if value:
    print("truthy")
else:
    print("falsy")

value = "hello"
if value:
    print("truthy")
else:
    print("falsy")

value = 42
if value:
    print("truthy")
else:
    print("falsy")

value = None
if value:
    print("truthy")
else:
    print("falsy")
