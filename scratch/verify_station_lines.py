import json

with open('data/metro.json', 'r', encoding='utf-8') as f:
    stations = json.load(f)

lines = {}
for s in stations:
    l = s.get('line')
    if isinstance(l, list):
        for sub_l in l:
            lines.setdefault(sub_l, []).append(s)
    else:
        lines.setdefault(l, []).append(s)

for l_name, st_list in lines.items():
    print(f"\n=== {l_name} Line ({len(st_list)} stations) ===")
    for idx, st in enumerate(st_list, 1):
        c = st['coordinates']
        print(f"  {idx:2d}. {st['id']:25s} | {st['stationName']:25s} | Lat: {c['lat']:.4f}, Lng: {c['lng']:.4f} | Interchange: {st.get('interchange')}")
