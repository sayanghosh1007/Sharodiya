import json
import re
import urllib.request
import sys

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

print("==================================================")
print("   FULL PUJA METRO MAP COMPREHENSIVE TEST SUITE   ")
print("==================================================")

# 1. Load data
with open('data/metro.json', 'r', encoding='utf-8') as f:
    stations = json.load(f)

with open('js/app.js', 'r', encoding='utf-8') as f:
    app_js = f.read()

with open('css/styles.css', 'r', encoding='utf-8') as f:
    styles_css = f.read()

with open('index.html', 'r', encoding='utf-8') as f:
    index_html = f.read()

# 2. Verify total stations
assert len(stations) == 48, f"Expected 48 stations, found {len(stations)}"
print(f"✓ Total Stations verified: {len(stations)}")

# 3. Extract METRO_LINE_TRACKS from js/app.js
match = re.search(r'const METRO_LINE_TRACKS = (\{[\s\S]*?\n    \});', app_js)
assert match, "Could not find METRO_LINE_TRACKS in app.js"

tracks_raw = match.group(1)
lines = {}
curr_line = None
for l in tracks_raw.split('\n'):
    l_strip = l.strip()
    if l_strip.endswith(':[') or l_strip.endswith(': ['):
        curr_line = l_strip.split(':')[0].strip()
        lines[curr_line] = []
    elif curr_line and '[' in l_strip and ']' in l_strip:
        coords_m = re.search(r'\[\s*([0-9.]+)\s*,\s*([0-9.]+)\s*\]', l_strip)
        if coords_m:
            lines[curr_line].append((float(coords_m.group(1)), float(coords_m.group(2))))

print("✓ Line track point counts:", {k: len(v) for k, v in lines.items()})
assert len(lines['Blue']) == 26
assert len(lines['Green']) == 12
assert len(lines['Purple']) == 7
assert len(lines['Orange']) == 5

# 4. Check that station markers and track lines are 100% aligned
for s in stations:
    s_lat = s['coordinates']['lat']
    s_lng = s['coordinates']['lng']
    s_lines = s['line'] if isinstance(s['line'], list) else [s['line']]
    for l_name in s_lines:
        track_points = lines.get(l_name, [])
        matches = [pt for pt in track_points if abs(pt[0] - s_lat) < 1e-5 and abs(pt[1] - s_lng) < 1e-5]
        assert len(matches) > 0, f"Station {s['id']} ({s['stationName']}) at ({s_lat}, {s_lng}) is NOT on {l_name} track polyline!"

print("✓ All 48 station coordinates are 100% perfectly aligned with track polylines.")

# 5. Check Esplanade -> Sealdah connection
esp_coords = (22.5639, 88.3516)
sea_coords = (22.5675, 88.3712)
assert esp_coords in lines['Green']
assert sea_coords in lines['Green']
esp_g_idx = lines['Green'].index(esp_coords)
sea_g_idx = lines['Green'].index(sea_coords)
assert abs(esp_g_idx - sea_g_idx) == 1, "Esplanade must be directly connected to Sealdah on Green Line"
print(f"✓ Esplanade (Index {esp_g_idx}) connects directly to Sealdah (Index {sea_g_idx}) on Green Line.")

# 6. Check Kavi Subhash -> Orange Line connection
ks_coords = (22.4634, 88.3976)
assert ks_coords == lines['Blue'][-1], "Kavi Subhash must terminate Blue Line"
assert ks_coords == lines['Orange'][0], "Kavi Subhash must originate Orange Line"
print(f"✓ Kavi Subhash ({ks_coords}) is properly connected to Blue Line and Orange Line.")

# 7. Check styles and CSS
assert '.metro-interchange-node-green' in styles_css
assert '.metro-interchange-node-orange' in styles_css
print("✓ Interchange visual CSS styles verified for Green & Orange transfers.")

# 8. Check button calls in js/app.js
calls = re.findall(r"selectMetroStation\(['\"](.*?)['\"]\)", app_js)
valid_ids = {s['id'] for s in stations}
for c in calls:
    assert c in valid_ids, f"Invalid station ID called: {c}"
print(f"✓ All {len(calls)} station button clicks in app.js point to valid stations.")

# 9. Test live HTTP endpoint
req = urllib.request.urlopen("http://localhost:3000/api/metro")
res = json.loads(req.read().decode('utf-8'))
assert res.get('success') == True
assert res.get('total') == 48
print("✓ Backend /api/metro API is healthy and returns 48 stations.")

print("\n==================================================")
print("   ALL TESTS PASSED! METRO MAP IS READY & VERIFIED! ")
print("==================================================")
