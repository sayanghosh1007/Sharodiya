import json

with open('data/metro.json', 'r', encoding='utf-8') as f:
    metro_data = json.load(f)

with open('data/pandals.json', 'r', encoding='utf-8') as f:
    pandals_data = json.load(f)

pandal_ids = {p['id'] for p in pandals_data}

print(f"Total stations: {len(metro_data)}")
for st in metro_data:
    st_id = st['id']
    nearby = st.get('nearbyPandals', [])
    for p in nearby:
        p_id = p.get('id') or p.get('pandalId')
        if p_id not in pandal_ids:
            print(f"WARNING: Station {st_id} references unknown pandal ID '{p_id}'")

print("Pandal reference check complete.")
