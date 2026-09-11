import json
from collections import defaultdict

with open("science_parsed_lessons_raw.json") as f:
    lessons = json.load(f)

counts = defaultdict(int)
for l in lessons:
    counts[l["ind_code"]] += 1

print("Indicator frequencies across 180 lessons:")
for k, v in sorted(counts.items()):
    print(f"  {k} : {v:2d} times")
