import json
import re

with open('data/metro.json', 'r', encoding='utf-8') as f:
    stations = json.load(f)

with open('js/app.js', 'r', encoding='utf-8') as f:
    app_js = f.read()

# Extract METRO_LINE_TRACKS from app.js
match = re.search(r'const METRO_LINE_TRACKS = (\{[\s\S]*?\n    \});', app_js)
if match:
    tracks_raw = match.group(1)
    print("Found METRO_LINE_TRACKS in app.js")
    # Let's inspect each line in tracks_raw
    for line in tracks_raw.split('\n'):
        print(line)

print("\n--- Comparing Stations vs Track Points ---")
# Let's create a map of station by approx lat/lng or name
for s in stations:
    lat = s['coordinates']['lat']
    lng = s['coordinates']['lng']
    print(f"Station {s['id']} ({s['stationName']}): ({lat}, {lng})")
