import urllib.request
import urllib.parse
import json
import re

def search_google_images_scraper(query):
    # Google Images search query
    q = urllib.parse.quote(f"{query} kolkata")
    url = f"https://www.google.com/search?q={q}&tbm=isch&asearch=ichp&async=_fmt:jspb"
    req = urllib.request.Request(
        url,
        headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': '*/*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': 'https://www.google.com/'
        }
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            content = resp.read().decode('utf-8', errors='ignore')
            # Look for image URLs
            urls = re.findall(r'https://encrypted-tbn0\.gstatic\.com/images\?q=[^\\",\s]+', content)
            img_urls = re.findall(r'\["(https://[^"]+\.(?:jpg|jpeg|png|webp))",\d+,\d+\]', content)
            lh_urls = re.findall(r'https://lh[3-6]\.googleusercontent\.com/[^\\",\s]+', content)
            return {'tbn': urls[:3], 'img': img_urls[:3], 'lh': lh_urls[:3], 'len': len(content)}
    except Exception as e:
        return {'error': str(e)}

print("Peter Cat:", search_google_images_scraper("Peter Cat Park Street"))
print("Arsalan:", search_google_images_scraper("Arsalan Park Circus"))
print("Flurys:", search_google_images_scraper("Flurys Park Street"))
