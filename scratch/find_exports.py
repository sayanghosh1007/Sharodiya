import re

with open('js/data.js', 'r', encoding='utf-8') as f:
    content = f.read()

exports = re.findall(r'export const ([A-Z_]+)', content)
print("Exports in js/data.js:", exports)

for exp in exports:
    pos = content.find(f"export const {exp}")
    print(f"  • {exp} at char {pos} (line {content[:pos].count(chr(10))+1})")
