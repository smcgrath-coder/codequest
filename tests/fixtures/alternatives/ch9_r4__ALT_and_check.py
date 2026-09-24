# Validate guesses between 1 and 10
guesses = [5, 15, 0, 8, 3, -1, 10]

def validate_guess(guesses):
    print("Checking guesses...")
    good = []
    for guess in guesses:
        if guess >= 1 and guess <= 10:
            print("Guess " + str(guess) + " accepted!")
            good.append(guess)
        else:
            print(str(guess) + " is out of range! Must be 1-10.")
    return good

print(validate_guess(guesses))
