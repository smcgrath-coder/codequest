values_to_test = [0, "", "hello", 42, None]
for value in values_to_test:
    print("truthy" if value else "falsy")
