import json
from collections import defaultdict

with open('data/eateries.json', 'r', encoding='utf-8') as f:
    eateries = json.load(f)

by_cat = defaultdict(list)
for e in eateries:
    by_cat[e.get('category')].append(e)

print(f"Total: {len(eateries)}")
for cat, items in by_cat.items():
    print(f"\n=== Category: {cat} (Total {len(items)}) ===")
    for item in items:
        print(f"[{item['id']}] {item['name']} | {item['location']} | Famous: {item.get('famousFor', '')}")
