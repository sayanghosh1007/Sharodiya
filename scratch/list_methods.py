with open('js/app.js', 'r', encoding='utf-8') as f:
    text = f.read()

import re
methods = re.findall(r'^\s{2}([a-zA-Z0-9_]+)\s*\([^)]*\)\s*\{', text, re.MULTILINE)
print(f"Total methods in app.js: {len(methods)}")
for m in methods:
    if 'map' in m.lower() or 'metro' in m.lower():
        print(f"  - {m}")
