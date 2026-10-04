with open('css/styles.css', 'r', encoding='utf-8') as f:
    text = f.read()

import re
matches = [m.start() for m in re.finditer('metro', text, re.IGNORECASE)]
print(f"Total matches in styles.css: {len(matches)}")
for pos in matches[:25]:
    line = text[:pos].count('\n') + 1
    print(f"Line {line}: {text[max(0, pos-20):min(len(text), pos+60)].strip()}")
