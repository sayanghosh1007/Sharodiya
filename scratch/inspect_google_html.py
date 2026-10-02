import urllib.request
import urllib.parse
import re

encoded = urllib.parse.quote("Peter Cat Restaurant Park Street Kolkata")
url = f"https://www.google.com/search?q={encoded}"
req = urllib.request.Request(
    url,
    headers={
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
)
with urllib.request.urlopen(req, timeout=10) as response:
    html = response.read().decode('utf-8', errors='ignore')

# Find all img src or data-src or lh3/lh5 URLs
urls = re.findall(r'https://[^"\'\s<>]+', html)
img_urls = [u for u in urls if any(ext in u.lower() for ext in ['.jpg', '.jpeg', '.png', '.webp', 'googleusercontent', 'gstatic'])]
print("Found image URLs:", len(img_urls))
for u in img_urls[:20]:
    print(u)
