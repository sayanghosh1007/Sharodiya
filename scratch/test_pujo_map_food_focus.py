import json
import re

print("--- Testing Pujo Map Food Focus & Metro Removal Integration ---")

# 1. Check index.html
with open("index.html", "r", encoding="utf-8") as f:
    html = f.read()

# Verify layer-toggle-metro is NOT inside #view-map
assert 'id="layer-toggle-metro"' not in html, "Found layer-toggle-metro in index.html (should be removed)"
assert 'id="map-pandal-food-focus-pill"' in html, "Missing #map-pandal-food-focus-pill in index.html"
assert 'id="master-osm-map"' in html, "Missing #master-osm-map in index.html"
assert 'id="view-metro"' in html, "Missing #view-metro in index.html"
print("1. index.html verified: Metro layer button removed from Pujo map, food focus pill added.")

# 2. Check css/styles.css
with open("css/styles.css", "r", encoding="utf-8") as f:
    css = f.read()

assert ".selected-pandal-pin" in css, "Missing .selected-pandal-pin in css"
assert ".food-map-pin.nearest-food-pin" in css, "Missing .nearest-food-pin in css"
assert ".pandal-food-connector-line" in css, "Missing .pandal-food-connector-line in css"
assert ".dark-pandal-food-popup" in css, "Missing .dark-pandal-food-popup in css"
print("2. css/styles.css verified: Pandal selection, nearest food joint pins & connector styles present.")

# 3. Check js/app.js
with open("js/app.js", "r", encoding="utf-8") as f:
    app_js = f.read()

assert "calculateDistanceMeters" in app_js, "Missing calculateDistanceMeters in app.js"
assert "selectPandalOnMasterMap" in app_js, "Missing selectPandalOnMasterMap in app.js"
assert "clearPandalFoodFocus" in app_js, "Missing clearPandalFoodFocus in app.js"
assert "foodLines" in app_js, "Missing foodLines layer in app.js"
assert "updateMapMetro()" not in app_js, "Found updateMapMetro() in app.js (should be removed from master map)"
assert "initMetroNetworkMap" in app_js, "Dedicated metro map engine should remain intact"
print("3. js/app.js verified: Master map focus on pandals and nearest food joints, metro removed from master map.")

print("\n--- ALL PUJO MAP & FOOD FOCUS CHECKS PASSED! ---")
