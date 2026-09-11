with open("science_raw_text.txt") as f:
    text = f.read()

pages = text.split("=== PAGE ")
print("=== PAGE 1 TEXT ===")
print(pages[1])
