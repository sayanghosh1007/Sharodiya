import urllib.request
import urllib.parse
import json
import time

with open('data/eateries.json', 'r', encoding='utf-8') as f:
    eateries = json.load(f)

print(f"Total eateries: {len(eateries)}")

def query_commons(title):
    url = f"https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrsearch={urllib.parse.quote(title)}&gsrnamespace=6&gsrlimit=3&prop=imageinfo&iiprop=url|mime"
    req = urllib.request.Request(url, headers={'User-Agent': 'SharodiyaApp/2.0 (contact: sharodiya@kolkata.org)'})
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            pages = data.get('query', {}).get('pages', {})
            for p in pages.values():
                for info in p.get('imageinfo', []):
                    u = info.get('url', '')
                    if u.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')) and not any(x in u.lower() for x in ['.pdf', '.djvu', '.svg']):
                        return (p.get('title'), u)
    except Exception as e:
        return None
    return None

found = 0
for i, e in enumerate(eateries[:30]):
    name = e['name']
    loc = e['location']
    # Try name + "Kolkata"
    res = query_commons(f"{name} Kolkata")
    if not res:
        res = query_commons(name)
    if res:
        found += 1
        print(f"[{i+1}] {name} -> {res[0]}")
    else:
        print(f"[{i+1}] {name} -> NO MATCH")
    time.sleep(0.2)

print(f"Matched {found}/30")
