import json
import os
import sys

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.abspath(os.path.join(CURRENT_DIR, '..'))
DATA_DIR = os.path.join(ROOT_DIR, 'data')
JS_DATA_PATH = os.path.join(ROOT_DIR, 'js', 'data.js')

def load_json(name):
    with open(os.path.join(DATA_DIR, name), 'r', encoding='utf-8') as f:
        return json.load(f)

pandals = load_json('pandals.json')
eateries = load_json('eateries.json')
schedule = load_json('schedule.json')
archetypes = load_json('archetypes.json')
initial_parikrama = load_json('initial_parikrama.json')
metro = load_json('metro.json')

print(f"Loaded {len(pandals)} pandals, {len(eateries)} eateries, {len(schedule)} schedule days, {len(archetypes)} archetypes, {len(metro)} metro stations.")

header = "// Sharodiya Curated Data Store - Authentic 141 Durga Puja Pandals & 250 Curated Eateries\n// Verified with established years, historical records, master artisans, Google available pictures, and Metro connectivity.\n\n"

content = header
content += "export const PANDALS_DATA = " + json.dumps(pandals, indent=2, ensure_ascii=False) + ";\n\n"
content += "export const EATERIES_DATA = " + json.dumps(eateries, indent=2, ensure_ascii=False) + ";\n\n"
content += "export const RITUAL_SCHEDULE = " + json.dumps(schedule, indent=2, ensure_ascii=False) + ";\n\n"
content += "export const COMPANION_ARCHETYPES = " + json.dumps(archetypes, indent=2, ensure_ascii=False) + ";\n\n"
content += "export const INITIAL_PARIKRAMA = " + json.dumps(initial_parikrama, indent=2, ensure_ascii=False) + ";\n\n"
content += "export const METRO_STATIONS_DATA = " + json.dumps(metro, indent=2, ensure_ascii=False) + ";\n"

with open(JS_DATA_PATH, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Successfully synchronized all datasets into {JS_DATA_PATH} ({len(content)} characters, {len(content.encode('utf-8'))} bytes)")
