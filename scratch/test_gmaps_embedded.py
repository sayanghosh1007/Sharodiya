import urllib.request
import urllib.parse
import re
import json

def get_gmaps_real_photo(query):
    q = urllib.parse.quote(f"{query} Kolkata")
    url = f"https://www.google.com/maps/search/{q}"
    req = urllib.request.Request(
        url,
        headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
        }
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            html = resp.read().decode('utf-8', errors='ignore')
            
            # Find all lh3/lh5 URLs inside APP_INITIALIZATION_STATE or strings
            lh_urls = re.findall(r'https://lh[3-6]\.googleusercontent\.com/p/[-a-zA-Z0-9_]+', html)
            if not lh_urls:
                lh_urls = re.findall(r'https://lh[3-6]\.googleusercontent\.com/[-a-zA-Z0-9_\/]+', html)
            
            # Filter out generic google logos or default avatars
            valid = []
            for u in lh_urls:
                if any(x in u for x in ['default', 'ggpht', 'avatar', 'photo.jpg']):
                    continue
                if len(u) > 50:
                    valid.append(u + "=s800-k-no")
            
            # Deduplicate
            valid = list(dict.fromkeys(valid))
            return valid[:3]
    except Exception as e:
        return [str(e)]

places = [
    "Peter Cat Park Street",
    "Arsalan Restaurant Park Circus",
    "Flurys Park Street",
    "Mocambo Restaurant Park Street",
    "Mitra Cafe Shobhabazar",
    "Aminia Restaurant New Market",
    "Shiraz Golden Restaurant Park Circus",
    "Royal Indian Hotel Chitpur",
    "6 Ballygunge Place Ballygunge",
    "Bhojohori Manna Ekdalia",
    "Kasturi Restaurant Dover Lane",
    "Oudh 1590 Deshapriya Park",
    "Dada Boudi Biryani Barrackpore",
    "Indian Coffee House College Street",
    "Paramount Sherbets College Street",
    "K.C. Das Sweets Esplanade",
    "Balaram Mullick Bhowanipore",
    "Girish Chandra Dey Nakur Nandy Hedua",
    "Bhim Chandra Nag Bowbazar",
    "Kusum Rolls Park Street"
]

for p in places:
    photos = get_gmaps_real_photo(p)
    print(f"{p}: {photos}", flush=True)
