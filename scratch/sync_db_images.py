import json
import os
import sys

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.abspath(os.path.join(CURRENT_DIR, '..'))
DB_PATH = os.path.join(ROOT_DIR, 'data', 'database.json')
EATERIES_PATH = os.path.join(ROOT_DIR, 'data', 'eateries.json')

with open(EATERIES_PATH, 'r', encoding='utf-8') as f:
    eateries = json.load(f)
eatery_img_map = {e['id']: e['image'] for e in eateries}

if os.path.exists(DB_PATH):
    with open(DB_PATH, 'r', encoding='utf-8') as f:
        db = json.load(f)
    
    updated_items = 0
    for plan_id, plan in db.get('parikramas', {}).items():
        for item in plan.get('items', []):
            if item.get('type') == 'eatery':
                eid = item.get('itemId')
                if eid in eatery_img_map:
                    if 'details' in item and isinstance(item['details'], dict):
                        item['details']['image'] = eatery_img_map[eid]
                        updated_items += 1
    
    with open(DB_PATH, 'w', encoding='utf-8') as f:
        json.dump(db, f, indent=2, ensure_ascii=False)
    print(f"Updated {updated_items} eatery items in {DB_PATH}")
