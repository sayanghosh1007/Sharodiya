import os
import re

patterns = [
    r'22\.\d{3,}', # Kolkata latitudes
    r'88\.\d{3,}'  # Kolkata longitudes
]

files_with_coords = []
for root, dirs, files in os.walk('.'):
    if any(ignore in root for ignore in ['.git', 'node_modules', '.gemini', 'assets']):
        continue
    for f in files:
        if f.endswith(('.js', '.json', '.html', '.py', '.css')) and not f.startswith('check_') and not f.startswith('test_'):
            path = os.path.join(root, f)
            with open(path, 'r', encoding='utf-8', errors='ignore') as fp:
                content = fp.read()
            if 'metro' in content.lower() and ('Green_West' in content or 'Green_East' in content or 'METRO_LINE_TRACKS' in content or '22.4722' in content):
                print(f"File with old track/metro coordinates: {path}")
