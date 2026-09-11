import json

with open("science_parsed_lessons_raw.json") as f:
    lessons = json.load(f)

print(f"Total lessons: {len(lessons)}")
for i in range(5):
    lesson = lessons[i]
    print(f"\n=== Lesson #{lesson['lesson_num']} (Term {lesson['term']}, Week {lesson['week']}, {lesson['day']}) ===")
    print(f"Strand: {lesson['strand_num']}. {lesson['strand_name']}")
    print(f"Sub-strand: {lesson['sub_strand']}")
    print(f"CS: {lesson['cs_code']} - {lesson['cs_desc'][:120]}...")
    print(f"Ind: {lesson['ind_code']} - {lesson['ind_desc'][:120]}...")
    print(f"Is Revision: {lesson['is_revision']}")
