import os
import json

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(CURRENT_DIR, '..', 'data')

def load_json_file(filename, default_val=None):
    if default_val is None:
        default_val = []
    filepath = os.path.join(DATA_DIR, filename)
    if os.path.exists(filepath):
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as err:
            print(f"[DataStore] Error loading {filename}: {err}")
    return default_val

PANDALS_DATA = load_json_file('pandals.json')
EATERIES_DATA = load_json_file('eateries.json')
METRO_STATIONS_DATA = load_json_file('metro.json')
RITUAL_SCHEDULE = load_json_file('schedule.json')
COMPANION_ARCHETYPES = load_json_file('archetypes.json', {})
INITIAL_PARIKRAMA = load_json_file('initial_parikrama.json')

print(f"[DataStore] Loaded {len(PANDALS_DATA)} pandals, {len(EATERIES_DATA)} eateries, {len(METRO_STATIONS_DATA)} metro stations, {len(RITUAL_SCHEDULE)} ritual days.")
