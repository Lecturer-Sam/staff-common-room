import pypdf
import re
import json

def parse_science_pdf():
    reader = pypdf.PdfReader("uploads/Basic1_Science_Scheme_of_Learning.pdf")
    all_pages_text = []
    for i, page in enumerate(reader.pages):
        all_pages_text.append(page.extract_text())
    
    # Let's save the raw text to a file so we can analyze it if needed
    with open("science_raw_text.txt", "w") as f:
        for idx, text in enumerate(all_pages_text):
            f.write(f"=== PAGE {idx+1} ===\n")
            f.write(text)
            f.write("\n\n")
    print("Extracted raw text from PDF to science_raw_text.txt")

parse_science_pdf()
