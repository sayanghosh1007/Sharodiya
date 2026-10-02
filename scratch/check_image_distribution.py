import json
from collections import Counter

with open('data/eateries.json', 'r', encoding='utf-8') as f:
    eateries = json.load(f)

print(f"Total eateries: {len(eateries)}")
imgs = [e['image'] for e in eateries]
counts = Counter(imgs)
print(f"Unique images: {len(counts)}")
print("\nImage breakdown by category:")
for cat in ['finedine', 'traditional', 'midnight', 'street', 'cafes']:
    cat_eats = [e for e in eateries if e['category'] == cat]
    cat_imgs = set(e['image'] for e in cat_eats)
    print(f"  • {cat.upper()}: {len(cat_eats)} eateries | {len(cat_imgs)} distinct authentic image sets")

print("\nSample check of top 20 eateries:")
for e in eateries[:20]:
    print(f"[{e['category']}] {e['name']} ({e['outlet']}) -> {e['image'][:70]}...")
