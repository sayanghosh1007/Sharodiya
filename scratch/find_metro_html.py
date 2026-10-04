with open('index.html', 'r', encoding='utf-8') as f:
    text = f.read()

import re
matches = [m.start() for m in re.finditer('metro', text, re.IGNORECASE)]
print(f"Total matches in index.html: {len(matches)}")
for pos in matches:
    line = text[:pos].count('\n') + 1
    print(f"Line {line}: {text[max(0, pos-40):min(len(text), pos+80)].strip()}")
