import json

with open('data/eateries.json', 'r', encoding='utf-8') as f:
    eateries = json.load(f)

for e in eateries:
    if any(k in e['name'].lower() or k in e['outlet'].lower() for k in ['peter', 'mocambo', 'flurys', 'arsalan', 'mitra', 'golbari', 'bhojohori', 'ballygunge', 'nakur', 'balaram']):
        print(f"[{e['id']}] {e['name']} ({e['outlet']}) - {e['category']}")
