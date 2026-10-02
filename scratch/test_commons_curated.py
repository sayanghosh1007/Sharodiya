import urllib.request
import urllib.parse
import json

def search_commons(query):
    # Wikimedia Commons search API
    url = f"https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch={urllib.parse.quote(query)}&gsrlimit=5&prop=imageinfo&iiprop=url|size|mime&format=json"
    req = urllib.request.Request(url, headers={'User-Agent': 'SharodiyaKolkata/2.0 (contact@sharodiya.org)'})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            pages = data.get('query', {}).get('pages', {})
            results = []
            for pid, p in pages.items():
                title = p.get('title', '')
                ii = p.get('imageinfo', [{}])[0]
                img_url = ii.get('url', '')
                if img_url and any(ext in img_url.lower() for ext in ['.jpg', '.jpeg', '.png', '.webp']):
                    results.append((title, img_url))
            return results
    except Exception as e:
        return [("error", str(e))]

queries = [
    "Peter Cat Kolkata",
    "Flurys Kolkata",
    "Indian Coffee House College Street",
    "Mocambo Kolkata",
    "Mitra Cafe",
    "K.C. Das",
    "Bhim Chandra Nag",
    "Kolkata Biryani",
    "Kolkata Kathi Roll",
    "Rosogolla Kolkata",
    "Mishti Doi",
    "Sandesh sweet",
    "Puchka Kolkata",
    "Fish fry Kolkata",
    "Awadhi Biryani",
    "Kosha Mangsho"
]

for q in queries:
    res = search_commons(q)
    print(f"=== {q} ===")
    for r in res[:2]:
        print(f"  {r[0]} -> {r[1]}")
