import re

with open('js/app.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for idx, line in enumerate(lines):
    if any(k in line.lower() for k in ['renderparikrama', 'renderitinerary', 'renderplan', 'loadplans', 'saveplans', 'switchday', 'selectday', 'parikrama-day', 'plan-day', 'createday', 'currentday', 'activeplan']):
        print(f"Line {idx+1}: {line.strip()[:100]}")
