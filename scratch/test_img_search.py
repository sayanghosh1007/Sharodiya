import urllib.request
import urllib.parse
import json
import re

def search_google_image(query):
    url = f"https://html.duckduckgo.com/html/?q={urllib.parse.quote(query + ' kolkata google photos')}"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            html = response.read().decode('utf-8', errors='ignore')
            # Look for image URLs
            print(f"Query {query}: HTML length {len(html)}")
    except Exception as e:
        print(f"Error {query}: {e}")

search_google_image("Peter Cat Park Street")
search_google_image("Arsalan Park Circus")
search_google_image("Flurys Park Street")
