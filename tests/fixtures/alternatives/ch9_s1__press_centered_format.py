# Title screen function
def show_title(game_name):
    border = "=" * 30
    print(border)
    print(f"{game_name:^30}")
    print(f"{'Press ENTER to start':^30}")
    print(border)

show_title("DRAGON QUEST")
