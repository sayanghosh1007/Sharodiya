import urllib.request
import urllib.parse
import json
import re
import time

def fetch_gmaps_photo(place_name, location="Kolkata"):
    query = f"{place_name} {location}"
    url = f"https://www.google.com/maps/search/{urllib.parse.quote(query)}"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
    }
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=12) as resp:
            content = resp.read().decode('utf-8', errors='ignore')
            # Look for lh3/lh5 googleusercontent photo URLs
            # Match pattern https://lh3.googleusercontent.com/p/AF1Qip... or /gps-proxy/ or similar
            matches = re.findall(r'https://lh[3-6]\.googleusercontent\.com/p/[a-zA-Z0-9_\-]+', content)
            if not matches:
                matches = re.findall(r'https://lh[3-6]\.googleusercontent\.com/[a-zA-Z0-9_\-]+', content)
            
            clean = []
            for m in matches:
                if any(x in m for x in ['default', 'avatar', 'logo']):
                    continue
                # format with high resolution w800-h600-k-no or =w800-h600-k-no
                clean.append(m + "=w800-h600-k-no")
            clean = list(dict.fromkeys(clean))
            return clean[:3]
    except Exception as e:
        return [f"Error: {e}"]

test_places = [
    "Peter Cat Park Street",
    "Arsalan Restaurant Park Circus",
    "Flurys Park Street",
    "Mocambo Park Street",
    "Mitra Cafe Shobhabazar",
    "Oudh 1590 Deshapriya Park",
    "6 Ballygunge Place",
    "Bhojohori Manna",
    "Aminia New Market",
    "Dada Boudi Biryani Barrackpore"
]

for p in test_places:
    res = fetch_gmaps_photo(p)
    print(f"{p}: {res}")
    time.sleep(1)
