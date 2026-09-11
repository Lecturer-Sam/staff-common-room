import pypdf

reader = pypdf.PdfReader("uploads/Basic1_Mathematics_Scheme_of_Learning.pdf")
full_text = []
for i, page in enumerate(reader.pages):
    full_text.append(page.extract_text())

with open("math_raw_text.txt", "w") as f:
    for idx, text in enumerate(full_text):
        f.write(f"=== PAGE {idx+1} ===\n")
        f.write(text)
        f.write("\n\n")

print("Saved raw math text to math_raw_text.txt")
