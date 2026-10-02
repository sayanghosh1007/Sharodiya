import json
from collections import defaultdict

with open('data/eateries.json', 'r', encoding='utf-8') as f:
    eateries = json.load(f)

print(f"Total eateries: {len(eateries)}")
by_cat = defaultdict(list)
for e in eateries:
    by_cat[e.get('category')].append(e)

for cat, items in by_cat.items():
    print(f"\n--- Category: {cat} ({len(items)} items) ---")
    for item in items[:8]:
        print(f"  • {item['name']} ({item['outlet']}) - {item.get('tag')} | mustTry: {', '.join(item.get('mustTry', [])[:2])}")
