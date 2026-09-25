# Title screen function
def show_title(game_name):
    print("=" * 30)
    spaces = (30 - len(game_name)) // 2
    print(" " * spaces + game_name)
    print("Press ENTER to start")
    print("=" * 30)

show_title("DRAGON QUEST")
