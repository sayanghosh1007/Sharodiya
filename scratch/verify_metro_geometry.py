import json
import re

with open('data/metro.json', 'r', encoding='utf-8') as f:
    stations = json.load(f)

with open('js/app.js', 'r', encoding='utf-8') as f:
    app_js = f.read()

# Extract METRO_LINE_TRACKS from app.js
match = re.search(r'const METRO_LINE_TRACKS = (\{[\s\S]*?\n    \});', app_js)
assert match, "Could not find METRO_LINE_TRACKS in app.js"

tracks_raw = match.group(1)
# Parse lines from tracks_raw
lines = {}
curr_line = None
for l in tracks_raw.split('\n'):
    l_strip = l.strip()
    if l_strip.endswith(':[') or l_strip.endswith(': ['):
        curr_line = l_strip.split(':')[0].strip()
        lines[curr_line] = []
    elif curr_line and '[' in l_strip and ']' in l_strip:
        # extract [lat, lng]
        coords_m = re.search(r'\[\s*([0-9.]+)\s*,\s*([0-9.]+)\s*\]', l_strip)
        if coords_m:
            lines[curr_line].append((float(coords_m.group(1)), float(coords_m.group(2))))

print("Parsed lines from app.js:", {k: len(v) for k, v in lines.items()})

assert 'Blue' in lines and len(lines['Blue']) == 26, f"Expected 26 Blue points, got {len(lines.get('Blue', []))}"
assert 'Green' in lines and len(lines['Green']) == 12, f"Expected 12 Green points, got {len(lines.get('Green', []))}"
assert 'Purple' in lines and len(lines['Purple']) == 7, f"Expected 7 Purple points, got {len(lines.get('Purple', []))}"
assert 'Orange' in lines and len(lines['Orange']) == 5, f"Expected 5 Orange points, got {len(lines.get('Orange', []))}"

# Check that every station coordinate matches its exact position on the track polyline
for s in stations:
    s_lat = s['coordinates']['lat']
    s_lng = s['coordinates']['lng']
    s_lines = s['line'] if isinstance(s['line'], list) else [s['line']]
    
    found_on_any = False
    for l_name in s_lines:
        track_points = lines.get(l_name, [])
        matches = [pt for pt in track_points if abs(pt[0] - s_lat) < 1e-5 and abs(pt[1] - s_lng) < 1e-5]
        if matches:
            found_on_any = True
            # print(f"  ✓ {s['id']:25s} matches on {l_name} Line: ({s_lat}, {s_lng})")
        else:
            print(f"  ✗ MISMATCH for {s['id']:25s} on {l_name} Line! Station=({s_lat}, {s_lng})")

    assert found_on_any, f"Station {s['id']} was not found on its track polyline!"

# Check Esplanade connection
esplanade_coords = (22.5639, 88.3516)
sealdah_coords = (22.5675, 88.3712)
kavi_subhash_coords = (22.4634, 88.3976)

assert esplanade_coords in lines['Blue'], "Esplanade not on Blue line"
assert esplanade_coords in lines['Green'], "Esplanade not on Green line"
assert sealdah_coords in lines['Green'], "Sealdah not on Green line"

# Check index of Esplanade and Sealdah in Green line are adjacent
esp_idx = lines['Green'].index(esplanade_coords)
sea_idx = lines['Green'].index(sealdah_coords)
print(f"Esplanade Green Index: {esp_idx}, Sealdah Green Index: {sea_idx}")
assert abs(esp_idx - sea_idx) == 1, "Esplanade and Sealdah are not connected adjacent stations on Green Line!"

# Check Kavi Subhash on Blue and Orange
assert kavi_subhash_coords in lines['Blue'], "Kavi Subhash not on Blue line"
assert kavi_subhash_coords in lines['Orange'], "Kavi Subhash not on Orange line"
assert lines['Blue'][-1] == kavi_subhash_coords, "Kavi Subhash must be terminal of Blue line"
assert lines['Orange'][0] == kavi_subhash_coords, "Kavi Subhash must be start terminal of Orange line"

print("\n--- ALL METRO ALIGNMENT & INTERCONNECT VERIFICATIONS PASSED 100%! ---")
