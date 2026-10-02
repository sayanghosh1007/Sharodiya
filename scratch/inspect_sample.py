import json

with open('data/eateries.json', 'r', encoding='utf-8') as f:
    eateries = json.load(f)

print(f"Loaded {len(eateries)} eateries.")
print("\nSample eateries:")
for e in eateries[:15]:
    print(f"ID: {e['id']} | Name: {e['name']} ({e['outlet']}) | MustTry: {e.get('mustTry', [])[:2]}")
