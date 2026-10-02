import urllib.request
import urllib.parse
import json
import re

def search_wikipedia_page_images(query):
    # Search Wikipedia API for page, then get thumbnail/original image
    url = f"https://en.wikipedia.org/w/api.php?action=query&format=json&generator=search&gsrsearch={urllib.parse.quote(query)}&gsrlimit=3&prop=pageimages|pageterms&piprop=original|thumbnail&pithumbsize=800"
    req = urllib.request.Request(url, headers={'User-Agent': 'SharodiyaApp/1.0'})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            pages = data.get('query', {}).get('pages', {})
            res = []
            for p in pages.values():
                title = p.get('title')
                img = p.get('original', {}).get('source') or p.get('thumbnail', {}).get('source')
                terms = p.get('terms', {}).get('description', [])
                if img:
                    res.append((title, img, terms))
            return res
    except Exception as e:
        return [str(e)]

places = [
    "Peter Cat Kolkata",
    "Flurys Kolkata",
    "Indian Coffee House Kolkata",
    "Mocambo Kolkata",
    "Mitra Cafe Kolkata",
    "Aminia restaurant",
    "Arsalan restaurant Kolkata",
    "Paramount Cold Drinks Kolkata",
    "K.C. Das Sweets Kolkata",
    "Bhim Chandra Nag",
    "Girish Chandra Dey & Nakur Chandra Nandy",
    "Bhojohori Manna",
    "6 Ballygunge Place",
    "Oudh 1590",
    "Dada Boudi Biryani",
    "Nizam's Kolkata"
]

for p in places:
    print(f"=== {p} ===")
    print(search_wikipedia_page_images(p))
