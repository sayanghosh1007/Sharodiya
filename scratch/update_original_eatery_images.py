import json
import sys

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

with open('data/eateries.json', 'r', encoding='utf-8') as f:
    eateries = json.load(f)

print(f"Total eateries to update: {len(eateries)}")
