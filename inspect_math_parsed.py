import json

with open("math_parsed_lessons_raw.json") as f:
    lessons = json.load(f)

for i in range(4):
    l = lessons[i]
    print(f"\n=== Lesson #{i+1} (Term {l['term']}, Week {l['week']}, Strand {l['strand_num']}) ===")
    print(f"Strand: {l['strand_name']}")
    print(f"Sub-strand: {l['sub_strand']}")
    print(f"CS Code: {l['cs_code']} - {l['cs_desc'][:120]}...")
    print(f"Ind Code: {l['ind_code']} - {l['ind_desc'][:120]}...")
