import urllib.request
import urllib.parse
import json
import re

def get_google_maps_photo(place_name):
    # Try searching Google Maps web search
    q = urllib.parse.quote(f"{place_name} Kolkata")
    url = f"https://www.google.com/maps/search/{q}"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
    }
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            html = resp.read().decode('utf-8', errors='ignore')
            # Look for lh3 / lh5 googleusercontent photo URLs
            lh_matches = re.findall(r'https://lh[35]\.googleusercontent\.com/p/[a-zA-Z0-9_\-]+', html)
            return list(dict.fromkeys(lh_matches))[:5]
    except Exception as e:
        return [str(e)]

print("Peter Cat Google Maps:", get_google_maps_photo("Peter Cat Park Street"))
print("Mocambo Google Maps:", get_google_maps_photo("Mocambo Restaurant Park Street"))
print("6 Ballygunge Place Google Maps:", get_google_maps_photo("6 Ballygunge Place Ballygunge"))
print("Aminia New Market Google Maps:", get_google_maps_photo("Aminia Restaurant New Market"))
