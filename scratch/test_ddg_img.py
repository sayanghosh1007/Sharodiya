import urllib.request
import urllib.parse
import re
import json

def ddg_image_search(query):
    # Step 1: get vqd token
    url = f"https://duckduckgo.com/?q={urllib.parse.quote(query)}"
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=10) as resp:
        html = resp.read().decode('utf-8')
    
    vqd_match = re.search(r'vqd=([0-9\-]+)', html)
    if not vqd_match:
        vqd_match = re.search(r'vqd="([0-9\-]+)"', html)
    if not vqd_match:
        return []
    vqd = vqd_match.group(1)
    
    # Step 2: call i.js
    img_url = f"https://duckduckgo.com/i.js?l=us-en&o=json&q={urllib.parse.quote(query)}&vqd={vqd}&f=,,,&p=1"
    req2 = urllib.request.Request(img_url, headers=headers)
    with urllib.request.urlopen(req2, timeout=10) as resp2:
        data = json.loads(resp2.read().decode('utf-8'))
        return data.get('results', [])

try:
    results = ddg_image_search("Peter Cat Park Street Kolkata")
    print("Results count:", len(results))
    for r in results[:3]:
        print("Title:", r.get('title'))
        print("Image:", r.get('image'))
        print("Thumbnail:", r.get('thumbnail'))
        print("---")
except Exception as e:
    print("Error:", e)
