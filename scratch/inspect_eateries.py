import json
from collections import Counter

with open('data/eateries.json', 'r', encoding='utf-8') as f:
    eateries = json.load(f)

print('Total eateries:', len(eateries))
print('Categories:', Counter(e.get('category') for e in eateries))
print('\nAll eatery names and locations:')
for i, e in enumerate(eateries):
    print(f"{i+1}. [{e.get('id')}] {e.get('name')} | {e.get('category')} | {e.get('location')} | {e.get('famousFor', '')}")
