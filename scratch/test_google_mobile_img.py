import urllib.request
import urllib.parse
import re

def google_search_images(query):
    # Try searching with Google Custom / mobile UA
    encoded = urllib.parse.quote(f"{query} Kolkata")
    url = f"https://www.google.com/search?q={encoded}&tbm=isch&gl=in&hl=en"
    req = urllib.request.Request(
        url,
        headers={
            'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36',
            'Accept-Language': 'en-IN,en-GB;q=0.9,en;q=0.8',
        }
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            html = resp.read().decode('utf-8', errors='ignore')
            # Extract image URLs
            # Google images on mobile have encrypted-tbn0.gstatic.com or direct links
            tbns = re.findall(r'https://encrypted-tbn0\.gstatic\.com/images\?q=tbn:[a-zA-Z0-9_\-]+', html)
            return {'tbns': list(dict.fromkeys(tbns))[:5], 'len': len(html)}
    except Exception as e:
        return {'error': str(e)}

print("Peter Cat:", google_search_images("Peter Cat Restaurant Park Street"))
print("Arsalan:", google_search_images("Arsalan Restaurant Park Circus"))
print("Flurys:", google_search_images("Flurys Park Street Kolkata"))
print("Mocambo:", google_search_images("Mocambo Restaurant Park Street Kolkata"))
