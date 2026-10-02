import urllib.request
import urllib.parse
import re
import json
import sys

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

def get_google_photos(query):
    # Search Google for the restaurant
    url = f"https://www.google.com/search?q={urllib.parse.quote(query)}&hl=en"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Sec-Ch-Ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"'
    }
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            html = resp.read().decode('utf-8', errors='ignore')
            # Look for lh3/lh5 googleusercontent photo URLs
            lh_urls = re.findall(r'https://lh[3-6]\.googleusercontent\.com/p/[-a-zA-Z0-9_]+', html)
            if not lh_urls:
                lh_urls = re.findall(r'https://lh[3-6]\.googleusercontent\.com/[-a-zA-Z0-9_\/]+', html)
            
            # Gstatic images
            tbn = re.findall(r'https://encrypted-tbn0\.gstatic\.com/images\?q=[-a-zA-Z0-9_:]+', html)
            return {'lh': list(dict.fromkeys(lh_urls)), 'tbn': list(dict.fromkeys(tbn)), 'len': len(html)}
    except Exception as e:
        return {'error': str(e)}

for p in ["Peter Cat Park Street Kolkata", "Flurys Park Street Kolkata", "Arsalan Park Circus Kolkata", "Mitra Cafe Shobhabazar Kolkata"]:
    print(p, get_google_photos(p))
