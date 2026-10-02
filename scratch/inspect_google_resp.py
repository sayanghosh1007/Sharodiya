import urllib.request
import urllib.parse
import re

encoded = urllib.parse.quote("Peter Cat Restaurant Park Street Kolkata")
url = f"https://www.google.com/search?q={encoded}&tbm=isch&gl=in&hl=en"
req = urllib.request.Request(
    url,
    headers={
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    }
)
with urllib.request.urlopen(req, timeout=10) as resp:
    html = resp.read().decode('utf-8', errors='ignore')

# Save sample to see what Google returns
print("First 2000 chars:", html[:2000])
matches = re.findall(r'https://[^"\'\s<>\\]+', html)
print("All https links:", len(matches))
for m in matches[:30]:
    print(m)
