import urllib.request
import urllib.parse
import json
import re

def get_google_photos(query):
    # Search Google for the place
    encoded = urllib.parse.quote(f"{query} kolkata")
    url = f"https://www.google.com/search?q={encoded}&tbm=isch"
    req = urllib.request.Request(
        url,
        headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
        }
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            html = response.read().decode('utf-8', errors='ignore')
            # Extract google user content or encrypted-tbn0 images or original image links
            lh_urls = re.findall(r'https://lh[0-9]\.googleusercontent\.com/[a-zA-Z0-9_\-\/=]+', html)
            tbn_urls = re.findall(r'https://encrypted-tbn0\.gstatic\.com/images\?q=[a-zA-Z0-9_\-\:]+', html)
            return {'lh': lh_urls[:5], 'tbn': tbn_urls[:5], 'len': len(html)}
    except Exception as e:
        return {'error': str(e)}

print("Peter Cat:", get_google_photos("Peter Cat Park Street"))
print("Arsalan:", get_google_photos("Arsalan Park Circus"))
print("Flurys:", get_google_photos("Flurys Park Street"))
