import urllib.request
import urllib.parse
import json
import re

def search_gmaps(query):
    # Google Maps URL search
    encoded = urllib.parse.quote(query)
    url = f"https://www.google.com/maps/search/?api=1&query={encoded}"
    req = urllib.request.Request(
        f"https://www.google.com/maps/search/{encoded}",
        headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            text = resp.read().decode('utf-8', errors='ignore')
            # Look for lh3/lh5 URLs
            matches = re.findall(r'https://lh[3-6]\.googleusercontent\.com/p/[a-zA-Z0-9_\-]+', text)
            if not matches:
                matches = re.findall(r'https://lh[3-6]\.googleusercontent\.com/[a-zA-Z0-9_\-\/]+', text)
            # filter out default icons
            good_matches = [m for m in matches if 'default' not in m and 'ggpht' not in m and len(m) > 40]
            return list(dict.fromkeys(good_matches))
    except Exception as e:
        return [str(e)]

print("Peter Cat:", search_gmaps("Peter Cat Park Street Kolkata"))
print("Arsalan:", search_gmaps("Arsalan Restaurant Park Circus Kolkata"))
print("Mocambo:", search_gmaps("Mocambo Restaurant Park Street Kolkata"))
