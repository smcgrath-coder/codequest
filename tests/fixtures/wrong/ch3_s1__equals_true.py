# Test each value
values_to_test = [0, "", "hello", 42, None]

for value in values_to_test:
    if value == True:
        print("truthy")
    else:
        print("falsy")
