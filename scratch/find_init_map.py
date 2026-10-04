with open('js/app.js', 'r', encoding='utf-8') as f:
    text = f.read()

import re
matches = [m.start() for m in re.finditer(r'initMap\s*\(', text)]
for pos in matches:
    line = text[:pos].count('\n') + 1
    print(f"initMap at line {line}:")
    print(text[pos:pos+1000])
