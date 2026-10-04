import json
import re

with open('data/metro.json', 'r', encoding='utf-8') as f:
    metro_data = json.load(f)

valid_ids = {s['id'] for s in metro_data}
print(f"Valid IDs ({len(valid_ids)}):", sorted(list(valid_ids)))

files_to_check = ['js/app.js', 'index.html']
for fn in files_to_check:
    with open(fn, 'r', encoding='utf-8') as f:
        content = f.read()
    calls = re.findall(r"selectMetroStation\(['\"](.*?)['\"]\)", content)
    for c in calls:
        if c not in valid_ids:
            print(f"ERROR in {fn}: selectMetroStation('{c}') is NOT in valid_ids!")
        else:
            print(f"OK in {fn}: selectMetroStation('{c}') is valid.")
