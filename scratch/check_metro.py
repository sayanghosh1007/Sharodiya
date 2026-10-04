import json

with open('data/metro.json', 'r', encoding='utf-8') as f:
    stations = json.load(f)

print(f"Total stations in data/metro.json: {len(stations)}")
for s in stations:
    line = s.get('line')
    interchange = s.get('interchange')
    st_id = s.get('id')
    name = s.get('stationName')
    coords = s.get('coordinates')
    print(f"{st_id:30s} | {name:25s} | Line: {str(line):20s} | Interchange: {str(interchange):5s} | Coords: {coords}")
