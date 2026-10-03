import json
import math
import os

def haversine_m(lat1, lon1, lat2, lon2):
    R = 6371000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2
    return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1-a))

def format_distance(meters):
    if meters < 1000:
        return f"{int(round(meters))} m"
    else:
        km = meters / 1000.0
        return f"{km:.1f} km"

def format_walk(meters):
    mins = max(1, int(round(meters / 80.0)))
    return f"{mins} min walk"

def main():
    with open('data/metro.json', 'r', encoding='utf-8') as f:
        metro_stations = json.load(f)

    with open('data/pandals.json', 'r', encoding='utf-8') as f:
        pandals = json.load(f)

    operational_stations = [s for s in metro_stations if s.get('operationalStatus') == 'operational']
    print(f"Loaded {len(metro_stations)} metro stations ({len(operational_stations)} operational) and {len(pandals)} pandals.")

    # Reset nearbyPandals for all stations
    station_map = {s['id']: s for s in metro_stations}
    for s in metro_stations:
        s['nearbyPandals'] = []
        s['nearbyPandalCount'] = 0

    pandal_assignments = {}

    for p in pandals:
        p_lat = p['coordinates']['lat']
        p_lng = p['coordinates']['lng']
        
        closest_station = None
        min_dist = float('inf')

        for s in operational_stations:
            s_lat = s['coordinates']['lat']
            s_lng = s['coordinates']['lng']
            dist = haversine_m(p_lat, p_lng, s_lat, s_lng)
            if dist < min_dist:
                min_dist = dist
                closest_station = s

        if closest_station:
            dist_text = format_distance(min_dist)
            walk_text = format_walk(min_dist)
            walk_minutes = max(1, int(round(min_dist / 80.0)))

            pandal_entry = {
                "id": p['id'],
                "pandalId": p['id'],
                "pandalName": p.get('name', ''),
                "name": p.get('name', ''),
                "zone": p.get('zone', ''),
                "zoneKey": p.get('zoneKey', ''),
                "category": p.get('category', ['traditional']),
                "rating": p.get('rating', 4.8),
                "theme": p.get('theme', ''),
                "image": p.get('image', ''),
                "distanceMeters": int(round(min_dist)),
                "distanceText": dist_text,
                "walkMinutes": walk_minutes,
                "walkText": walk_text,
                "coordinates": p['coordinates']
            }

            closest_id = closest_station['id']
            station_map[closest_id]['nearbyPandals'].append(pandal_entry)
            pandal_assignments[p['id']] = (closest_station['stationName'], min_dist)

    # Sort each station's nearby pandals by distance
    for s in metro_stations:
        s['nearbyPandals'].sort(key=lambda x: x['distanceMeters'])
        s['nearbyPandalCount'] = len(s['nearbyPandals'])

    # Validate that every pandal is assigned to EXACTLY ONE metro station
    all_assigned_pandal_ids = []
    for s in metro_stations:
        for p in s['nearbyPandals']:
            all_assigned_pandal_ids.append(p['id'])

    print(f"Total assignments: {len(all_assigned_pandal_ids)}")
    print(f"Unique pandals assigned: {len(set(all_assigned_pandal_ids))}")
    assert len(all_assigned_pandal_ids) == len(set(all_assigned_pandal_ids)), "Duplicate pandal found across multiple stations!"
    assert len(set(all_assigned_pandal_ids)) == len(pandals), f"Some pandals were not assigned: {len(pandals) - len(set(all_assigned_pandal_ids))}"

    print("\n--- SUMMARY OF EXCLUSIVE CLOSEST PANDALS PER METRO STATION ---")
    active_station_count = 0
    for s in metro_stations:
        count = s['nearbyPandalCount']
        if count > 0:
            active_station_count += 1
            closest_p = s['nearbyPandals'][0]
            print(f"[{s['line']}] {s['stationName']}: {count} pandals | Closest: {closest_p['name']} ({closest_p['distanceText']})")

    print(f"\n{active_station_count} out of {len(operational_stations)} operational stations have assigned pandals.")

    # Save updated data/metro.json
    with open('data/metro.json', 'w', encoding='utf-8') as f:
        json.dump(metro_stations, f, indent=2, ensure_ascii=False)
    print("Saved clean exclusive assignments to data/metro.json")

    # Update pandals.json nearestMetro field to strictly match this closest station
    for p in pandals:
        if p['id'] in pandal_assignments:
            st_name, _ = pandal_assignments[p['id']]
            p['nearestMetro'] = st_name

    with open('data/pandals.json', 'w', encoding='utf-8') as f:
        json.dump(pandals, f, indent=2, ensure_ascii=False)
    print("Updated nearestMetro in data/pandals.json")

if __name__ == '__main__':
    main()
