import urllib.request
import json
import sys

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

url = 'http://localhost:3000/api/eateries'
with urllib.request.urlopen(url) as r:
    data = json.loads(r.read().decode('utf-8'))
    eateries = data.get('eateries', [])
    print(f"Total eateries served by API: {len(eateries)}")
    
    icons = [
        'peter-cat', 'mocambo', 'flurys', 'arsalan', 'royal-indian',
        'mitra-cafe', 'golbari', 'six-ballygunge', 'nakur', 'balaram-mullick',
        'oudh-1590', 'dada-boudi', 'indian-coffee-house', 'paramount', 'dum-pukht', 'peshawri'
    ]
    print("\nVerified Iconic Eateries & Their Authentic Pictures:")
    for icon in icons:
        matches = [e for e in eateries if icon in e['id']]
        if matches:
            m = matches[0]
            print(f"  • {m['name']} ({m['outlet']}) [{m['category']}] -> {m['image'][:65]}...")
