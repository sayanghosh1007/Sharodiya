import urllib.request
import urllib.parse
import json
import re

def search_gmaps_cid(query):
    # Search Google Maps via https://www.google.com/maps/search/{query}
    encoded = urllib.parse.quote(query)
    url = f"https://www.google.com/maps/search/{encoded}"
    req = urllib.request.Request(
        url,
        headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
        }
    )
    try:
        with urllib.request.urlopen(req, timeout=8) as resp:
            content = resp.read().decode('utf-8', errors='ignore')
            # Look for lh3/lh5 googleusercontent photo URLs
            lh_urls = re.findall(r'https://lh[3-6]\.googleusercontent\.com/p/[a-zA-Z0-9_\-]+', content)
            if not lh_urls:
                lh_urls = re.findall(r'https://lh[3-6]\.googleusercontent\.com/[a-zA-Z0-9_\-]+', content)
            return list(dict.fromkeys(lh_urls))
    except Exception as e:
        return [str(e)]

print("Peter Cat:", search_gmaps_cid("Peter Cat Park Street Kolkata"), flush=True)
print("Arsalan:", search_gmaps_cid("Arsalan Restaurant Park Circus Kolkata"), flush=True)
