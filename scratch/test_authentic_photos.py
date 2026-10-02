import urllib.request
import urllib.parse
import json
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# Let's test a curated dictionary of authentic images for iconic places
test_dict = {
    "flurys": "https://upload.wikimedia.org/wikipedia/commons/f/fe/Flurys%2C_Park_Street%2C_Kolkata%2C_Street_View.jpg",
    "coffee_house": "https://upload.wikimedia.org/wikipedia/commons/8/89/Indian_Coffee_House%2C_Kolkata_%286334188949%29.jpg",
    "park_street": "https://upload.wikimedia.org/wikipedia/commons/1/16/Parkstreet.png",
    "kolkata_biryani": "https://upload.wikimedia.org/wikipedia/commons/5/5a/%22_Kolkata_Biryani_%22.jpg",
    "kathi_roll": "https://upload.wikimedia.org/wikipedia/commons/7/7b/Chicken_Kathi_Roll.jpg",
    "daab_chingri": "https://upload.wikimedia.org/wikipedia/commons/6/6f/Daab_Chingri_-_Kolkata_2017-05-18_0411.jpg",
    "bhetki_paturi": "https://upload.wikimedia.org/wikipedia/commons/9/90/Bhetki_Machher_Paturi.jpg",
    "phuchka": "https://upload.wikimedia.org/wikipedia/commons/9/94/Phuchka_Kolkata.jpg",
    "mutton_kosha": "https://upload.wikimedia.org/wikipedia/commons/2/23/Kosha_Mangsho.jpg",
    "mishti_doi": "https://upload.wikimedia.org/wikipedia/commons/4/47/Mishti_Doi.jpg",
    "rosogolla": "https://upload.wikimedia.org/wikipedia/commons/f/f9/Rasgulla_from_Kolkata.jpg",
    "sandesh": "https://upload.wikimedia.org/wikipedia/commons/7/74/Bengali_sandesh_Kolkata_-_West_Bengal_-_DSC_0044.jpg",
    "singara_kachori": "https://upload.wikimedia.org/wikipedia/commons/7/72/Singara_-_Kolkata_2015-02-27_0493.JPG"
}

for name, url in test_dict.items():
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
        with urllib.request.urlopen(req, timeout=5) as r:
            print(f"✅ {name}: HTTP {r.status} ({len(r.read())} bytes)")
    except Exception as e:
        print(f"❌ {name}: {e}")
