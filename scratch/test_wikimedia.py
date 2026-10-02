import urllib.request
import urllib.parse
import json
import re

def search_wikimedia(query):
    endpoint = "https://commons.wikimedia.org/w/api.php"
    params = {
        "action": "query",
        "format": "json",
        "generator": "search",
        "gsrsearch": query,
        "gsrnamespace": "6", # File namespace
        "gsrlimit": "3",
        "prop": "imageinfo",
        "iiprop": "url|mime"
    }
    url = f"{endpoint}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={'User-Agent': 'SharodiyaApp/1.0 (contact: sharodiya@kolkata.org)'})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            pages = data.get('query', {}).get('pages', {})
            urls = []
            for p in pages.values():
                for info in p.get('imageinfo', []):
                    urls.append(info.get('url'))
            return urls
    except Exception as e:
        return [str(e)]

print("Peter Cat:", search_wikimedia("Peter Cat Park Street Kolkata"))
print("Flurys:", search_wikimedia("Flurys Kolkata"))
print("Indian Coffee House:", search_wikimedia("Indian Coffee House College Street Kolkata"))
print("Mitra Cafe:", search_wikimedia("Mitra Cafe Kolkata"))
print("Arsalan:", search_wikimedia("Arsalan Kolkata"))
