import json

with open('data/metro.json', 'r', encoding='utf-8') as f:
    stations = json.load(f)

for s in stations:
    name = s['stationName']
    c = s['coordinates']
    print(f"{s['id']:25s} | {name:25s} | lat: {c['lat']}, lng: {c['lng']} | landmark: {s.get('landmark', '')}")
