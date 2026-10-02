import urllib.request
import urllib.parse
import re
import json

def test_sources(query):
    print(f"=== Testing for: {query} ===")
    
    # 1. Duckduckgo HTML
    try:
        url = f"https://html.duckduckgo.com/html/?q={urllib.parse.quote(query)}"
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
        with urllib.request.urlopen(req, timeout=10) as resp:
            html = resp.read().decode('utf-8', errors='ignore')
            links = re.findall(r'href="//duckduckgo.com/l/\?uddg=([^&]+)', html)
            decoded = [urllib.parse.unquote(l) for l in links]
            print("DDG web links found:", len(decoded))
            for d in decoded[:3]:
                print("  Link:", d)
    except Exception as e:
        print("DDG HTML error:", e)

    # 2. Wikipedia search
    try:
        url = f"https://en.wikipedia.org/w/api.php?action=query&format=json&generator=search&gsrsearch={urllib.parse.quote(query)}&gsrlimit=2&prop=pageimages&piprop=original|thumbnail&pithumbsize=600"
        req = urllib.request.Request(url, headers={'User-Agent': 'Sharodiya/1.0'})
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            pages = data.get('query', {}).get('pages', {})
            for pid, p in pages.items():
                print("  Wiki:", p.get('title'), "->", p.get('thumbnail', {}).get('source'))
    except Exception as e:
        print("Wiki error:", e)

    # 3. Google search HTML
    try:
        url = f"https://www.google.com/search?q={urllib.parse.quote(query)}"
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'})
        with urllib.request.urlopen(req, timeout=10) as resp:
            html = resp.read().decode('utf-8', errors='ignore')
            lh_urls = re.findall(r'https://lh[3-6]\.googleusercontent\.com/[^\s\"\'\<\>]+', html)
            gstatic = re.findall(r'https://encrypted-tbn0\.gstatic\.com/images\?q=[^\s\"\'\<\>]+', html)
            print("Google search LH URLs:", len(lh_urls), "Gstatic:", len(gstatic))
            for u in lh_urls[:3]:
                print("  LH:", u)
            for u in gstatic[:3]:
                print("  GSTATIC:", u)
    except Exception as e:
        print("Google search error:", e)

test_sources("Peter Cat Park Street Kolkata")
test_sources("Arsalan Restaurant Park Circus Kolkata")
test_sources("Flurys Park Street Kolkata")
