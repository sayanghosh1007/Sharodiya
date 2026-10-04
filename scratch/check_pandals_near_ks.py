import json
import math

def haversine(lat1, lon1, lat2, lon2):
    R = 6371000 # meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

with open('data/pandals.json', 'r', encoding='utf-8') as f:
    pandals = json.load(f)

ks_lat, ks_lng = 22.4634, 88.3976
print("Pandals within 2.5km of Kavi Subhash:")
for p in pandals:
    c = p.get('coordinates', {})
    if 'lat' in c and 'lng' in c:
        d = haversine(ks_lat, ks_lng, c['lat'], c['lng'])
        if d < 2500:
            print(f"  {p['id']}: {p['name']} ({int(d)}m) - Nearest Metro: {p.get('nearestMetro')}")
