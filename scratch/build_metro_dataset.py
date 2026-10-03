import json
import math
import os

def haversine_m(lat1, lon1, lat2, lon2):
    R = 6371000  # meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = math.sin(delta_phi/2.0)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(delta_lambda/2.0)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

# Raw Real Operational Stations of Kolkata Metro
RAW_STATIONS = [
    # 🔵 BLUE LINE (North-South Line 1)
    {
        "id": "metro-dakshineswar",
        "stationName": "Dakshineswar",
        "line": "Blue",
        "lineName": "Blue Line (North-South)",
        "lineColor": "#0057B7",
        "operationalStatus": "operational",
        "interchange": False,
        "coordinates": {"lat": 22.6534, "lng": 88.3575},
        "landmark": "Dakshineswar Kali Temple / Bally Bridge corridor"
    },
    {
        "id": "metro-baranagar",
        "stationName": "Baranagar",
        "line": "Blue",
        "lineName": "Blue Line (North-South)",
        "lineColor": "#0057B7",
        "operationalStatus": "operational",
        "interchange": False,
        "coordinates": {"lat": 22.6417, "lng": 88.3688},
        "landmark": "BT Road / Dunlop Crossing"
    },
    {
        "id": "metro-noapara",
        "stationName": "Noapara",
        "line": "Blue",
        "lineName": "Blue Line (North-South)",
        "lineColor": "#0057B7",
        "operationalStatus": "operational",
        "interchange": False,
        "coordinates": {"lat": 22.6375, "lng": 88.3888},
        "landmark": "North Kolkata Rail & Metro Interchange"
    },
    {
        "id": "metro-dumdum",
        "stationName": "Dum Dum",
        "line": "Blue",
        "lineName": "Blue Line (North-South)",
        "lineColor": "#0057B7",
        "operationalStatus": "operational",
        "interchange": False,
        "coordinates": {"lat": 22.6217, "lng": 88.3934},
        "landmark": "Dum Dum Park & Tarun Sangha Hub"
    },
    {
        "id": "metro-belgachia",
        "stationName": "Belgachia",
        "line": "Blue",
        "lineName": "Blue Line (North-South)",
        "lineColor": "#0057B7",
        "operationalStatus": "operational",
        "interchange": False,
        "coordinates": {"lat": 22.6067, "lng": 88.3850},
        "landmark": "Gateway to Sreebhumi & Lake Town"
    },
    {
        "id": "metro-shyambazar",
        "stationName": "Shyambazar",
        "line": "Blue",
        "lineName": "Blue Line (North-South)",
        "lineColor": "#0057B7",
        "operationalStatus": "operational",
        "interchange": False,
        "coordinates": {"lat": 22.6022, "lng": 88.3711},
        "landmark": "5-Point Crossing, Bagbazar Sarbojonin, Jagat Mukherjee Park"
    },
    {
        "id": "metro-shobhabazar",
        "stationName": "Shobhabazar Sutanuti",
        "line": "Blue",
        "lineName": "Blue Line (North-South)",
        "lineColor": "#0057B7",
        "operationalStatus": "operational",
        "interchange": False,
        "coordinates": {"lat": 22.5982, "lng": 88.3662},
        "landmark": "Kumartuli Artisans Quarter, Shovabazar Rajbari"
    },
    {
        "id": "metro-girish-park",
        "stationName": "Girish Park",
        "line": "Blue",
        "lineName": "Blue Line (North-South)",
        "lineColor": "#0057B7",
        "operationalStatus": "operational",
        "interchange": False,
        "coordinates": {"lat": 22.5857, "lng": 88.3607},
        "landmark": "Chaltabagan, Simla Bayam Samity, Vivekananda Ancestral Home"
    },
    {
        "id": "metro-mg-road",
        "stationName": "Mahatma Gandhi Road",
        "line": "Blue",
        "lineName": "Blue Line (North-South)",
        "lineColor": "#0057B7",
        "operationalStatus": "operational",
        "interchange": False,
        "coordinates": {"lat": 22.5815, "lng": 88.3605},
        "landmark": "College Street Book Market, Mohammad Ali Park"
    },
    {
        "id": "metro-central",
        "stationName": "Central",
        "line": "Blue",
        "lineName": "Blue Line (North-South)",
        "lineColor": "#0057B7",
        "operationalStatus": "operational",
        "interchange": False,
        "coordinates": {"lat": 22.5684, "lng": 88.3607},
        "landmark": "Bowbazar, Calcutta Medical College, Santosh Mitra Square"
    },
    {
        "id": "metro-chandni",
        "stationName": "Chandni Chowk",
        "line": "Blue",
        "lineName": "Blue Line (North-South)",
        "lineColor": "#0057B7",
        "operationalStatus": "operational",
        "interchange": False,
        "coordinates": {"lat": 22.5658, "lng": 88.3562},
        "landmark": "Electronics Hub & Central Kolkata Heritage"
    },
    {
        "id": "metro-esplanade",
        "stationName": "Esplanade",
        "line": ["Blue", "Green"],
        "lineName": "Blue Line ↔ Green Line Interchange",
        "lineColor": "#0057B7",
        "operationalStatus": "operational",
        "interchange": True,
        "interchangeLines": ["Blue", "Green"],
        "coordinates": {"lat": 22.5639, "lng": 88.3516},
        "landmark": "Grand Central Transit Hub, Dharmatala, New Market"
    },
    {
        "id": "metro-park-street",
        "stationName": "Park Street",
        "line": "Blue",
        "lineName": "Blue Line (North-South)",
        "lineColor": "#0057B7",
        "operationalStatus": "operational",
        "interchange": False,
        "coordinates": {"lat": 22.5539, "lng": 88.3513},
        "landmark": "Park Street Dining Corridor, Mocambo, Peter Cat, Flurys"
    },
    {
        "id": "metro-maidan",
        "stationName": "Maidan",
        "line": "Blue",
        "lineName": "Blue Line (North-South)",
        "lineColor": "#0057B7",
        "operationalStatus": "operational",
        "interchange": False,
        "coordinates": {"lat": 22.5463, "lng": 88.3496},
        "landmark": "Victoria Memorial & Brigade Parade Ground"
    },
    {
        "id": "metro-rabindra-sadan",
        "stationName": "Rabindra Sadan",
        "line": "Blue",
        "lineName": "Blue Line (North-South)",
        "lineColor": "#0057B7",
        "operationalStatus": "operational",
        "interchange": False,
        "coordinates": {"lat": 22.5401, "lng": 88.3483},
        "landmark": "Nandan Cultural Complex, Academy of Fine Arts & Exide Crossing"
    },
    {
        "id": "metro-netaji-bhavan",
        "stationName": "Netaji Bhavan",
        "line": "Blue",
        "lineName": "Blue Line (North-South)",
        "lineColor": "#0057B7",
        "operationalStatus": "operational",
        "interchange": False,
        "coordinates": {"lat": 22.5350, "lng": 88.3477},
        "landmark": "Bhawanipore Pandals, 75 Palli, Bakulbagan, Paddapukur"
    },
    {
        "id": "metro-jatin-das-park",
        "stationName": "Jatin Das Park",
        "line": "Blue",
        "lineName": "Blue Line (North-South)",
        "lineColor": "#0057B7",
        "operationalStatus": "operational",
        "interchange": False,
        "coordinates": {"lat": 22.5273, "lng": 88.3471},
        "landmark": "Maddox Square, Hazra Park, Chakraberia Sarbojonin"
    },
    {
        "id": "metro-kalighat",
        "stationName": "Kalighat",
        "line": "Blue",
        "lineName": "Blue Line (North-South)",
        "lineColor": "#0057B7",
        "operationalStatus": "operational",
        "interchange": False,
        "coordinates": {"lat": 22.5186, "lng": 88.3458},
        "landmark": "Kalighat Temple, Deshapriya Park, Badamtala Ashar Sangha, 66 Palli"
    },
    {
        "id": "metro-rabindra-sarobar",
        "stationName": "Rabindra Sarobar",
        "line": "Blue",
        "lineName": "Blue Line (North-South)",
        "lineColor": "#0057B7",
        "operationalStatus": "operational",
        "interchange": False,
        "coordinates": {"lat": 22.5085, "lng": 88.3457},
        "landmark": "Mudiali Club, Shib Mandir, Southern Avenue Lakes"
    },
    {
        "id": "metro-uttam-kumar",
        "stationName": "Mahanayak Uttam Kumar",
        "line": "Blue",
        "lineName": "Blue Line (North-South)",
        "lineColor": "#0057B7",
        "operationalStatus": "operational",
        "interchange": False,
        "coordinates": {"lat": 22.4988, "lng": 88.3454},
        "landmark": "Suruchi Sangha, Haridevpur, Tollygunge Golf Club"
    },
    {
        "id": "metro-netaji",
        "stationName": "Netaji (Kudghat)",
        "line": "Blue",
        "lineName": "Blue Line (North-South)",
        "lineColor": "#0057B7",
        "operationalStatus": "operational",
        "interchange": False,
        "coordinates": {"lat": 22.4891, "lng": 88.3468},
        "landmark": "Kudghat, Ranikuthi, Haridevpur Pandals"
    },
    {
        "id": "metro-surya-sen",
        "stationName": "Masterda Surya Sen",
        "line": "Blue",
        "lineName": "Blue Line (North-South)",
        "lineColor": "#0057B7",
        "operationalStatus": "operational",
        "interchange": False,
        "coordinates": {"lat": 22.4789, "lng": 88.3503},
        "landmark": "Bansdroni & South Suburbs"
    },
    {
        "id": "metro-gitanjali",
        "stationName": "Gitanjali (Naktala)",
        "line": "Blue",
        "lineName": "Blue Line (North-South)",
        "lineColor": "#0057B7",
        "operationalStatus": "operational",
        "interchange": False,
        "coordinates": {"lat": 22.4705, "lng": 88.3572},
        "landmark": "Naktala Udayan Sangha epicenter"
    },
    {
        "id": "metro-kavi-nazrul",
        "stationName": "Kavi Nazrul (Garia Bazar)",
        "line": "Blue",
        "lineName": "Blue Line (North-South)",
        "lineColor": "#0057B7",
        "operationalStatus": "operational",
        "interchange": False,
        "coordinates": {"lat": 22.4632, "lng": 88.3697},
        "landmark": "Garia, Mahamayatala, Baishnabghata Patuli"
    },
    {
        "id": "metro-shahid-khudiram",
        "stationName": "Shahid Khudiram (Briji)",
        "line": "Blue",
        "lineName": "Blue Line (North-South)",
        "lineColor": "#0057B7",
        "operationalStatus": "operational",
        "interchange": False,
        "coordinates": {"lat": 22.4630, "lng": 88.3842},
        "landmark": "EM Bypass Garia Link"
    },
    {
        "id": "metro-kavi-subhash",
        "stationName": "Kavi Subhash",
        "line": ["Blue", "Orange"],
        "lineName": "Blue Line ↔ Orange Line Interchange",
        "lineColor": "#0057B7",
        "operationalStatus": "operational",
        "interchange": True,
        "interchangeLines": ["Blue", "Orange"],
        "coordinates": {"lat": 22.4634, "lng": 88.3976},
        "landmark": "New Garia Junction & EM Bypass Orange Corridor"
    },

    # 🟢 GREEN LINE (East-West Line 2)
    {
        "id": "metro-howrah-maidan",
        "stationName": "Howrah Maidan",
        "line": "Green",
        "lineName": "Green Line (East-West)",
        "lineColor": "#009A44",
        "operationalStatus": "operational",
        "interchange": False,
        "coordinates": {"lat": 22.5878, "lng": 88.3308},
        "landmark": "Howrah District Court & Maidan Terminus"
    },
    {
        "id": "metro-howrah",
        "stationName": "Howrah Railway Station",
        "line": "Green",
        "lineName": "Green Line (East-West)",
        "lineColor": "#009A44",
        "operationalStatus": "operational",
        "interchange": False,
        "coordinates": {"lat": 22.5855, "lng": 88.3426},
        "landmark": "Howrah Railway Station & Under-River Ganga Tunnel"
    },
    {
        "id": "metro-mahakaran",
        "stationName": "Mahakaran",
        "line": "Green",
        "lineName": "Green Line (East-West)",
        "lineColor": "#009A44",
        "operationalStatus": "operational",
        "interchange": False,
        "coordinates": {"lat": 22.5714, "lng": 88.3486},
        "landmark": "Writers' Building, BBD Bagh & Heritage Business District"
    },
    {
        "id": "metro-sealdah",
        "stationName": "Sealdah",
        "line": "Green",
        "lineName": "Green Line (East-West)",
        "lineColor": "#009A44",
        "operationalStatus": "operational",
        "interchange": False,
        "coordinates": {"lat": 22.5675, "lng": 88.3712},
        "landmark": "Sealdah Railway Junction, Baithakkhana & Jagat Mukherjee Park"
    },
    {
        "id": "metro-phoolbagan",
        "stationName": "Phoolbagan",
        "line": "Green",
        "lineName": "Green Line (East-West)",
        "lineColor": "#009A44",
        "operationalStatus": "operational",
        "interchange": False,
        "coordinates": {"lat": 22.5714, "lng": 88.3905},
        "landmark": "Phoolbagan Crossing, Kankurgachi Mitali Sangha"
    },
    {
        "id": "metro-stadium",
        "stationName": "Salt Lake Stadium",
        "line": "Green",
        "lineName": "Green Line (East-West)",
        "lineColor": "#009A44",
        "operationalStatus": "operational",
        "interchange": False,
        "coordinates": {"lat": 22.5694, "lng": 88.4057},
        "landmark": "Yuba Bharati Krirangan & Beleghata Link"
    },
    {
        "id": "metro-bengal-chemical",
        "stationName": "Bengal Chemical",
        "line": "Green",
        "lineName": "Green Line (East-West)",
        "lineColor": "#009A44",
        "operationalStatus": "operational",
        "interchange": False,
        "coordinates": {"lat": 22.5768, "lng": 88.4019},
        "landmark": "EM Bypass & Maniktala Main Road junction"
    },
    {
        "id": "metro-city-centre",
        "stationName": "City Centre",
        "line": "Green",
        "lineName": "Green Line (East-West)",
        "lineColor": "#009A44",
        "operationalStatus": "operational",
        "interchange": False,
        "coordinates": {"lat": 22.5898, "lng": 88.4069},
        "landmark": "City Centre 1, Labony Estate, Salt Lake AJ/BJ blocks"
    },
    {
        "id": "metro-central-park",
        "stationName": "Central Park",
        "line": "Green",
        "lineName": "Green Line (East-West)",
        "lineColor": "#009A44",
        "operationalStatus": "operational",
        "interchange": False,
        "coordinates": {"lat": 22.5901, "lng": 88.4137},
        "landmark": "Salt Lake Mela Ground & Central Park"
    },
    {
        "id": "metro-karunamoyee",
        "stationName": "Karunamoyee",
        "line": "Green",
        "lineName": "Green Line (East-West)",
        "lineColor": "#009A44",
        "operationalStatus": "operational",
        "interchange": False,
        "coordinates": {"lat": 22.5867, "lng": 88.4208},
        "landmark": "Central Park, Salt Lake Bus Terminus, EE Block"
    },
    {
        "id": "metro-sector-v",
        "stationName": "Salt Lake Sector V",
        "line": "Green",
        "lineName": "Green Line (East-West)",
        "lineColor": "#009A44",
        "operationalStatus": "operational",
        "interchange": False,
        "coordinates": {"lat": 22.5802, "lng": 88.4357},
        "landmark": "FD Block, BJ Block, Sector V Tech Corridor"
    },

    # 🟣 PURPLE LINE (Line 3 - Joka to Majerhat)
    {
        "id": "metro-joka",
        "stationName": "Joka",
        "line": "Purple",
        "lineName": "Purple Line (South-West)",
        "lineColor": "#7F2B87",
        "operationalStatus": "operational",
        "interchange": False,
        "coordinates": {"lat": 22.4497, "lng": 88.3039},
        "landmark": "IIM Calcutta, Diamond Harbour Road & Joka Terminus"
    },
    {
        "id": "metro-thakurpukur",
        "stationName": "Thakurpukur",
        "line": "Purple",
        "lineName": "Purple Line (South-West)",
        "lineColor": "#7F2B87",
        "operationalStatus": "operational",
        "interchange": False,
        "coordinates": {"lat": 22.4619, "lng": 88.3082},
        "landmark": "Thakurpukur 3A Bus Stand & Barisha South"
    },
    {
        "id": "metro-sakherbazar",
        "stationName": "Sakherbazar",
        "line": "Purple",
        "lineName": "Purple Line (South-West)",
        "lineColor": "#7F2B87",
        "operationalStatus": "operational",
        "interchange": False,
        "coordinates": {"lat": 22.4754, "lng": 88.3128},
        "landmark": "Sakherbazar, Barisha Club & Natun Sangha"
    },
    {
        "id": "metro-behala-chowrasta",
        "stationName": "Behala Chowrasta",
        "line": "Purple",
        "lineName": "Purple Line (South-West)",
        "lineColor": "#7F2B87",
        "operationalStatus": "operational",
        "interchange": False,
        "coordinates": {"lat": 22.4867, "lng": 88.3168},
        "landmark": "Behala Chowrasta, Behala Natun Dal & Barisha Club"
    },
    {
        "id": "metro-behala-bazar",
        "stationName": "Behala Bazar",
        "line": "Purple",
        "lineName": "Purple Line (South-West)",
        "lineColor": "#7F2B87",
        "operationalStatus": "operational",
        "interchange": False,
        "coordinates": {"lat": 22.4972, "lng": 88.3204},
        "landmark": "Behala Tram Depot & Behala Club"
    },
    {
        "id": "metro-taratala",
        "stationName": "Taratala",
        "line": "Purple",
        "lineName": "Purple Line (South-West)",
        "lineColor": "#7F2B87",
        "operationalStatus": "operational",
        "interchange": False,
        "coordinates": {"lat": 22.5118, "lng": 88.3242},
        "landmark": "Taratala Crossing, Hyde Road & South Port Corridor"
    },
    {
        "id": "metro-majerhat",
        "stationName": "Majerhat",
        "line": "Purple",
        "lineName": "Purple Line (South-West)",
        "lineColor": "#7F2B87",
        "operationalStatus": "operational",
        "interchange": False,
        "coordinates": {"lat": 22.5205, "lng": 88.3283},
        "landmark": "Majerhat Rail-Over-Bridge & Alipore Link"
    },

    # 🟠 ORANGE LINE (Line 6 - Kavi Subhash to Hemanta Mukhopadhyay)
    {
        "id": "metro-satyajit-ray",
        "stationName": "Satyajit Ray",
        "line": "Orange",
        "lineName": "Orange Line (EM Bypass Corridor)",
        "lineColor": "#FF7300",
        "operationalStatus": "operational",
        "interchange": False,
        "coordinates": {"lat": 22.4795, "lng": 88.3989},
        "landmark": "Hiland Park, SRFTI & Ajoy Nagar"
    },
    {
        "id": "metro-jyotirindra-nandi",
        "stationName": "Jyotirindra Nandi",
        "line": "Orange",
        "lineName": "Orange Line (EM Bypass Corridor)",
        "lineColor": "#FF7300",
        "operationalStatus": "operational",
        "interchange": False,
        "coordinates": {"lat": 22.4950, "lng": 88.4005},
        "landmark": "Mukundapur Hospital Corridor & Santoshpur link"
    },
    {
        "id": "metro-kavi-sukanta",
        "stationName": "Kavi Sukanta",
        "line": "Orange",
        "lineName": "Orange Line (EM Bypass Corridor)",
        "lineColor": "#FF7300",
        "operationalStatus": "operational",
        "interchange": False,
        "coordinates": {"lat": 22.5065, "lng": 88.4018},
        "landmark": "Kalikapur Crossing & Prince Anwar Shah Connector"
    },
    {
        "id": "metro-hemanta-mukhopadhyay",
        "stationName": "Hemanta Mukhopadhyay",
        "line": "Orange",
        "lineName": "Orange Line (EM Bypass Corridor)",
        "lineColor": "#FF7300",
        "operationalStatus": "operational",
        "interchange": False,
        "coordinates": {"lat": 22.5161, "lng": 88.4032},
        "landmark": "Ruby Hospital, Kasba Connector & Acropolis Mall"
    }
]

def main():
    with open('data/pandals.json', 'r', encoding='utf-8') as f:
        pandals = json.load(f)

    enriched_stations = []

    for st in RAW_STATIONS:
        st_lat = st['coordinates']['lat']
        st_lng = st['coordinates']['lng']

        # Calculate distances to all 141 pandals
        pandal_distances = []
        for p in pandals:
            p_lat = p['coordinates']['lat']
            p_lng = p['coordinates']['lng']
            dist = haversine_m(st_lat, st_lng, p_lat, p_lng)

            # Consider pandals within 3.5 km
            if dist <= 3500:
                walk_mins = max(1, round(dist / 80.0))  # approx 80m per min (~4.8 km/h)
                dist_str = f"{int(dist)} m" if dist < 1000 else f"{dist/1000.0:.1f} km"
                walk_str = f"{walk_mins} min walk" if walk_mins < 60 else f"{walk_mins//60}h {walk_mins%60}m"
                
                pandal_distances.append({
                    "id": p["id"],
                    "pandalId": p["id"],
                    "pandalName": p["name"],
                    "name": p["name"],
                    "zone": p.get("zone", ""),
                    "zoneKey": p.get("zoneKey", "all"),
                    "category": p.get("category", ["popular"]),
                    "rating": p.get("rating", 4.8),
                    "theme": p.get("theme", ""),
                    "image": p.get("image", ""),
                    "distanceMeters": int(round(dist)),
                    "distanceText": dist_str,
                    "walkMinutes": walk_mins,
                    "walkText": walk_str,
                    "coordinates": p["coordinates"]
                })

        # Sort by distance
        pandal_distances.sort(key=lambda x: x['distanceMeters'])

        station_obj = dict(st)
        station_obj["name"] = st["stationName"]
        station_obj["nearbyPandals"] = pandal_distances
        station_obj["nearbyPandalCount"] = len(pandal_distances)
        enriched_stations.append(station_obj)

    # Save to data/metro.json
    with open('data/metro.json', 'w', encoding='utf-8') as f:
        json.dump(enriched_stations, f, indent=2, ensure_ascii=False)

    print(f"Successfully generated {len(enriched_stations)} operational metro stations with linked pandals in data/metro.json")

if __name__ == '__main__':
    main()
