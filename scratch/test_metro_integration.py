import json
import urllib.request
import re

print("--- Testing Kolkata Puja Metro Network Integration ---")

# 1. Test data/metro.json
with open("data/metro.json", "r", encoding="utf-8") as f:
    metro_data = json.load(f)

print(f"1. data/metro.json loaded: {len(metro_data)} total stations")
assert len(metro_data) == 48, f"Expected 48 operational stations, got {len(metro_data)}"

# Check operationalStatus
for s in metro_data:
    assert s.get("operationalStatus") == "operational", f"Station {s.get('stationName')} is not operational"

# Check interchanges
interchanges = [s for s in metro_data if s.get("interchange")]
print(f"   Interchange stations: {[s['stationName'] for s in interchanges]}")
assert len(interchanges) == 2, f"Expected 2 interchanges, got {len(interchanges)}"
interchange_names = {s["stationName"] for s in interchanges}
assert "Esplanade" in interchange_names and "Kavi Subhash" in interchange_names

# Check line counts
blue_count = len([s for s in metro_data if s["line"] == "Blue" or (isinstance(s["line"], list) and "Blue" in s["line"])])
green_count = len([s for s in metro_data if s["line"] == "Green" or (isinstance(s["line"], list) and "Green" in s["line"])])
purple_count = len([s for s in metro_data if s["line"] == "Purple" or (isinstance(s["line"], list) and "Purple" in s["line"])])
orange_count = len([s for s in metro_data if s["line"] == "Orange" or (isinstance(s["line"], list) and "Orange" in s["line"])])

print(f"   Line breakdown: Blue={blue_count}, Green={green_count}, Purple={purple_count}, Orange={orange_count}")
assert blue_count == 26
assert green_count == 12
assert purple_count == 7
assert orange_count == 5

# Check walking distance calculations
shyambazar = next(s for s in metro_data if s["stationName"] == "Shyambazar")
print(f"   Shyambazar nearby pandals count: {len(shyambazar['nearbyPandals'])}")
assert len(shyambazar["nearbyPandals"]) > 0
for p in shyambazar["nearbyPandals"]:
    assert "distanceMeters" in p
    assert "distanceText" in p
    assert "walkMinutes" in p
    assert "walkText" in p
print(f"   Sample nearby pandal at Shyambazar: {shyambazar['nearbyPandals'][0]['pandalName']} ({shyambazar['nearbyPandals'][0]['distanceText']} · {shyambazar['nearbyPandals'][0]['walkText']})")

# 2. Test index.html
with open("index.html", "r", encoding="utf-8") as f:
    html = f.read()

assert 'id="view-metro"' in html, "Missing #view-metro in index.html"
assert 'id="metro-network-osm-map"' in html, "Missing #metro-network-osm-map in index.html"
assert 'id="metro-station-info-panel"' in html, "Missing #metro-station-info-panel in index.html"
assert 'id="pujo-metro-planner-modal"' in html, "Missing #pujo-metro-planner-modal in index.html"
assert 'data-path="metro"' in html, "Missing data-path='metro' navigation link in index.html"
assert 'data-line="Blue"' in html, "Missing line filter buttons in index.html"
print("2. index.html contains all metro layout components and modal markup")

# 3. Test css/styles.css
with open("css/styles.css", "r", encoding="utf-8") as f:
    css = f.read()

assert "--metro-blue: #0057B7" in css, "Missing --metro-blue in css"
assert "--metro-green: #009A44" in css, "Missing --metro-green in css"
assert "--metro-purple: #7F2B87" in css, "Missing --metro-purple in css"
assert "--metro-orange: #FF7300" in css, "Missing --metro-orange in css"
assert ".metro-station-node" in css, "Missing .metro-station-node in css"
assert ".metro-interchange-node" in css, "Missing .metro-interchange-node in css"
assert ".metro-pandal-marker" in css, "Missing .metro-pandal-marker in css"
print("3. css/styles.css contains all official metro colors and pin markers")

# 4. Test js/app.js
with open("js/app.js", "r", encoding="utf-8") as f:
    app_js = f.read()

assert "initMetroNetworkMap" in app_js, "Missing initMetroNetworkMap in js/app.js"
assert "drawMetroLineTracks" in app_js, "Missing drawMetroLineTracks in js/app.js"
assert "updateMetroNetworkMap" in app_js, "Missing updateMetroNetworkMap in js/app.js"
assert "renderMetroStationInfoPanel" in app_js, "Missing renderMetroStationInfoPanel in js/app.js"
assert "openMetroPlannerModal" in app_js, "Missing openMetroPlannerModal in js/app.js"
assert "saveMetroRouteToParikrama" in app_js, "Missing saveMetroRouteToParikrama in js/app.js"
print("4. js/app.js contains all metro engine, route planner, and interaction methods")

# 5. Test Live HTTP API
req = urllib.request.urlopen("http://localhost:3000/api/metro")
api_res = json.loads(req.read().decode("utf-8"))
assert api_res.get("success") == True, "API call /api/metro failed"
assert api_res.get("total") == 48, f"Expected 48 in API, got {api_res.get('total')}"
print("5. Live backend API /api/metro returns 200 OK with all 48 stations")

print("\n--- ALL TESTS PASSED SUCCESSFULLY! ---")
