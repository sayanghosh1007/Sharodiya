import re
import os
import json
import urllib.request
import urllib.error
try:
    from .data_store import PANDALS_DATA, EATERIES_DATA, RITUAL_SCHEDULE
except ImportError:
    from data_store import PANDALS_DATA, EATERIES_DATA, RITUAL_SCHEDULE

STOPWORDS = {
    'what', 'when', 'where', 'who', 'which', 'how', 'why', 'is', 'are', 'was', 'were',
    'the', 'a', 'an', 'and', 'or', 'for', 'in', 'on', 'at', 'to', 'from', 'with', 'by', 'of',
    'tell', 'about', 'can', 'get', 'order', 'serve', 'serves', 'its', 'their', 'rules',
    'timing', 'timings', 'time', 'nearest', 'history', 'significance', 'does', 'should',
    'would', 'please', 'know', 'find', 'recommend', 'give', 'me', 'i', 'you', 'your',
    'we', 'our', 'good', 'best', 'popular', 'famous', 'night', 'nights', 'around', 'puja', 'run', 'like'
}

def normalize_text(text):
    if not text:
        return ''
    t = text.lower()
    t = t.replace('sarbojanin', 'sarbojonin')
    t = t.replace('rasgulla', 'rosogolla')
    t = t.replace('sandesh', 'sondesh')
    t = re.sub(r'[^\w\s]', ' ', t)
    return ' '.join(t.split())

def retrieve_puja_knowledge(query):
    norm_query = normalize_text(query)
    raw_words = [w for w in norm_query.split() if len(w) > 1]
    keywords = [w for w in raw_words if w not in STOPWORDS and len(w) > 2]

    # 1. Transit Score
    transit_score = 0
    if re.search(r'metro|train|bus|transport|traffic|subway|how\s+to\s+reach|transit|route', norm_query):
        transit_score = 380
        if not re.search(r'pandal|food|eat|restaurant|sweet|cabin|dish|thali', norm_query):
            transit_score = 550

    # 2. Pandal Scoring
    scored_pandals = []
    for p in PANDALS_DATA:
        score = 0
        name = normalize_text(p.get('name', ''))
        loc = normalize_text(p.get('location', ''))
        theme = normalize_text(p.get('theme', ''))
        artisan = normalize_text(p.get('artisan', ''))
        pid = normalize_text(p.get('id', ''))

        if name == norm_query or pid == norm_query:
            score += 500
        if norm_query in name or (len(norm_query) > 3 and name in norm_query):
            score += 350

        for kw in keywords:
            if kw in name:
                score += 120
            if kw in artisan:
                score += 80
            if kw in theme:
                score += 40
            if kw in loc:
                score += 30

        if any(term in norm_query for term in ['pandal', 'theme', 'artisan', 'sculptor']):
            if score > 0:
                score += 60

        if score > 0:
            scored_pandals.append({'pandal': p, 'score': score})

    scored_pandals.sort(key=lambda x: x['score'], reverse=True)

    # 3. Eatery Scoring
    scored_eateries = []
    for e in EATERIES_DATA:
        score = 0
        name = normalize_text(e.get('name', ''))
        loc = normalize_text(e.get('location', ''))
        cuisine = normalize_text(e.get('cuisine', ''))
        dishes = normalize_text(' '.join(e.get('mustTry', [])))
        eid = normalize_text(e.get('id', ''))

        if name == norm_query or eid == norm_query:
            score += 500
        if norm_query in name or (len(norm_query) > 3 and name in norm_query):
            score += 350

        for kw in keywords:
            if kw in name:
                score += 120
            if kw in dishes:
                score += 70
            if kw in cuisine:
                score += 50
            if kw in loc:
                score += 20

        if re.search(r'food|eat|biryani|sweet|sweets|mishti|restaurant|cabin|sandesh|sondesh|doi|kebab|roll|fish|paturi|dine|dining|thali', norm_query):
            if score > 0:
                score += 100

        if score > 0:
            scored_eateries.append({'eatery': e, 'score': score})

    scored_eateries.sort(key=lambda x: x['score'], reverse=True)

    # 4. Ritual Schedule Scoring
    ritual_score = 0
    matched_schedule = []
    ritual_regex = r'pushpanjali|sandhi|kumari|kola\s*bou|nabapatrika|bodhon|aarti|bisarjan|sindoor|tithi|muhurat|fasting|bhog|ashtami|navami|saptami|sasthi|dashami|pran\s*pratistha|yajna|darpan'
    
    if re.search(ritual_regex, norm_query):
        ritual_score = 400
        for day in RITUAL_SCHEDULE:
            day_name = normalize_text(day.get('day', ''))
            tithi = normalize_text(day.get('bengaliTithi', ''))
            day_matched = norm_query in day_name or norm_query in tithi or day.get('id', '') in norm_query

            rel_events = []
            for ev in day.get('events', []):
                title = normalize_text(ev.get('title', ''))
                if norm_query in title or title in norm_query or any(len(kw) > 3 and kw in title for kw in keywords):
                    rel_events.append(ev)

            if rel_events:
                matched_schedule.append({
                    'day': day.get('day'),
                    'tithi': day.get('bengaliTithi'),
                    'date': day.get('englishDate'),
                    'guidelines': day.get('guidelines'),
                    'events': rel_events
                })
            elif day_matched:
                matched_schedule.append({
                    'day': day.get('day'),
                    'tithi': day.get('bengaliTithi'),
                    'date': day.get('englishDate'),
                    'guidelines': day.get('guidelines'),
                    'events': day.get('events')
                })

    top_pandal = scored_pandals[0]['pandal'] if scored_pandals else None
    pandal_score = scored_pandals[0]['score'] if scored_pandals else 0
    top_eatery = scored_eateries[0]['eatery'] if scored_eateries else None
    eatery_score = scored_eateries[0]['score'] if scored_eateries else 0

    return {
        'topPandal': top_pandal,
        'pandalScore': pandal_score,
        'allPandals': [item['pandal'] for item in scored_pandals[:4]],
        'topEatery': top_eatery,
        'eateryScore': eatery_score,
        'allEateries': [item['eatery'] for item in scored_eateries[:4]],
        'ritualScore': ritual_score,
        'matchedSchedule': matched_schedule,
        'transitScore': transit_score
    }

def generate_accurate_puja_answer(prompt):
    context = retrieve_puja_knowledge(prompt)
    scores = [
        ('pandal', context['pandalScore']),
        ('eatery', context['eateryScore']),
        ('ritual', context['ritualScore']),
        ('transit', context['transitScore'])
    ]
    scores.sort(key=lambda x: x[1], reverse=True)
    winner_type, winner_score = scores[0]

    # 1. TRANSIT & METRO MASTERGUIDE
    if winner_type == 'transit' and winner_score > 0:
        return (
            "🚇 **Kolkata Metro & Transit Masterguide for Durga Puja 2026:**\n\n"
            "1. **Green Line (East-West Underwater Corridor):**\n"
            "   - Connects **Howrah Railway Station** to **Esplanade** (via India's first Underwater Metro Tunnel beneath River Hooghly) and extends to **Salt Lake Sector V** and **Karunamoyee** in under 20 minutes!\n"
            "   - *Best Route from Howrah to Salt Lake:* Board at Howrah Station, ride underwater to Esplanade, and continue directly on the Green Line to Salt Lake!\n\n"
            "2. **Blue Line (North-South Corridor - Runs ALL NIGHT on Saptami, Ashtami & Navami):**\n"
            "   - **North Hub:** Sovabazar Sutanuti & Shyambazar (for Bagbazar, Kumartuli, Hatibagan, Kashi Bose Lane).\n"
            "   - **Central Hub:** MG Road & Central (for College Square, Md. Ali Park, Santosh Mitra Square).\n"
            "   - **South Hub:** Netaji Bhavan & Jatin Das Park (for Maddox Square, 66 Palli, Bakulbagan).\n"
            "   - **South Epicenter:** Kalighat (Gate 3) & Rabindra Sarobar (for Deshapriya Park, Tridhara, Ballygunge Cultural, Mudiali, Shiv Mandir, Chetla Agrani).\n\n"
            "3. **VIP Road & Airport Corridor:**\n"
            "   - Auto/Bus shuttles run 24/7 along VIP Road connecting Ultadanga to **Sreebhumi Sporting Club**, **Lake Town**, and **Dum Dum Tarun Dal**.\n\n"
            "💡 *Transit Tip:* Buy a Kolkata Metro Tourist Smart Card or QR token in advance to bypass ticket queues!"
        )

    # 2. SPECIFIC PANDAL
    if winner_type == 'pandal' and winner_score > 0 and context['topPandal']:
        top = context['topPandal']
        resp = f"🏛️ **{top.get('name')}**\n\n"
        resp += f"- **Zone & Location:** {top.get('zone')} ({top.get('location')})\n"
        resp += f"- **Established:** Year {top.get('estYear')} ({2026 - int(top.get('estYear', 2000))}+ Years of Heritage)\n"
        resp += f"- **Nearest Metro Station:** 🚇 **{top.get('nearestMetro')}**\n"
        resp += f"- **2026 Theme / Concept:** *{top.get('theme')}*\n"
        resp += f"- **Master Artisans & Sculptors:** 🎨 {top.get('artisan')}\n"
        resp += f"- **Best Visiting Hours:** ⏱️ {top.get('bestTime')} (Est. Queue Wait: ~{top.get('queueTime', '25 mins')})\n\n"
        resp += f"📖 **Historical Background:**\n{top.get('history', top.get('description'))}\n\n"
        if len(context['allPandals']) > 1:
            others = [f"**{p.get('name')}** ({p.get('nearestMetro')})" for p in context['allPandals'][1:]]
            resp += "✨ *Related Nearby Pandals:* " + ", ".join(others)
        return resp

    # 3. SPECIFIC EATERY
    if winner_type == 'eatery' and winner_score > 0 and context['topEatery']:
        top = context['topEatery']
        resp = f"🍽️ **{top.get('name')}** ({top.get('outlet', 'Kolkata')})\n\n"
        resp += f"- **Location / Address:** 📍 {top.get('address', top.get('location'))}\n"
        resp += f"- **Cuisine Style:** {top.get('cuisine')} ({top.get('tagline', top.get('tag', ''))})\n"
        resp += f"- **Rating & Connoisseur Feedback:** ⭐ **{top.get('rating', 4.8)} / 5.0** ({top.get('reviews', '10,000+')} reviews)\n"
        resp += f"- **Average Price for Two:** 💰 **{top.get('avgPrice', '₹400 for two')}**\n"
        resp += f"- **Operating Timings:** ⏰ **{top.get('timings', '11:00 AM - 11:00 PM')}** (Wait Time: ~{top.get('waitTime', '20 mins')})\n\n"
        must_tries = [f"  • **{m}**" for m in top.get('mustTry', [])]
        if must_tries:
            resp += "✨ **Signature Dishes (Must-Order):**\n" + "\n".join(must_tries) + "\n\n"
        resp += f"📝 *Insider Tip:* {top.get('description', '')}\n"
        if len(context['allEateries']) > 1:
            others = [f"**{e.get('name')}** ({e.get('avgPrice', '')})" for e in context['allEateries'][1:]]
            resp += "\n🌟 *Other Top Recommendations Nearby:* " + ", ".join(others)
        return resp

    # 4. RITUAL SCHEDULE
    if winner_type == 'ritual' and winner_score > 0:
        resp = "🌸 **Durga Puja 2026 Sacred Ritual Timetable & Muhurats:**\n\n"
        if context['matchedSchedule']:
            for day in context['matchedSchedule']:
                resp += f"📅 **{day.get('day')} ({day.get('tithi')})** — *{day.get('date')}*\n"
                if day.get('guidelines'):
                    resp += f"💡 *Devotee Protocol:* {day.get('guidelines')}\n\n"
                for ev in day.get('events', []):
                    resp += f"  • **{ev.get('title')}** [⏰ **{ev.get('time')}**]\n"
                    resp += f"    └ {ev.get('desc')}\n"
                    if ev.get('significance'):
                        resp += f"    └ *Spiritual Significance:* {ev.get('significance')}\n"
                resp += "\n"
        else:
            resp += (
                "1. **Maha Sasthi (Friday, Oct 16, 2026):**\n   - Kalparambho & Bodhon (07:00 AM – 09:30 AM)\n   - Devi Amontron & Adhibas (06:30 PM – 08:30 PM)\n\n"
                "2. **Maha Saptami (Saturday, Oct 17, 2026):**\n   - Nabapatrika / Kola Bou Snan at Ganges Ghats (05:45 AM – 07:30 AM)\n   - Saptami Pran Pratistha & Maha Bhog (11:30 AM – 01:00 PM)\n\n"
                "3. **Maha Ashtami (Sunday, Oct 18, 2026):**\n   - **Mahashtami Pushpanjali Timings:** 10:00 AM – 11:30 AM (Strict fasting required before offering floral Anjali with Bel leaves)\n   - **Kumari Puja:** 11:30 AM – 01:00 PM\n   - **Sandhi Puja (108 Lotuses & 108 Lamps):** 06:15 PM – 07:03 PM (Devi Chamunda invocation during the exact Ashtami-Navami transition)\n\n"
                "4. **Maha Navami (Monday, Oct 19, 2026):**\n   - Maha Navami Havan & Yajna (10:30 AM – 12:30 PM)\n   - Grand Dhunuchi Naach Competitions (07:30 PM onwards)\n\n"
                "5. **Vijaya Dashami (Tuesday, Oct 20, 2026):**\n   - Darpan Bisarjan (09:00 AM – 10:30 AM)\n   - Devi Boron & Sindoor Khela (11:00 AM – 02:00 PM)\n   - Sacred Bisarjan Ghat Processions (04:00 PM – 11:00 PM)"
            )
        return resp

    # 5. GENERAL COMPREHENSIVE OVERVIEW
    return (
        "🕉️ **Sharodiya AI Cultural Companion:**\n\n"
        "Welcome to Kolkata Durga Puja 2026! I have verified records across **141 Pandals**, **250 Eateries**, and **5-Day Ritual Timetables**.\n\n"
        "Here are some exact topics you can ask me:\n"
        "- **Pandal Lookups:** *\"Tell me about Bagbazar Sarbojanin\"* or *\"Who is the artist for Chetla Agrani?\"*\n"
        "- **Metro Directions:** *\"Nearest metro station to Ekdalia Evergreen\"* or *\"How to reach Sreebhumi?\"*\n"
        "- **Muhurats & Tithis:** *\"When is Mahashtami Pushpanjali and Sandhi Puja?\"* or *\"Sindoor Khela timing\"*\n"
        "- **Food & Eateries:** *\"Best midnight biryani open at 3 AM\"* or *\"Famous sweet shops for Jolbhora Sandesh\"*\n"
        "- **Itinerary:** Launch the **Personalized Itinerary Builder** or explore the dedicated **Map Section**!"
    )

def handle_ai_companion_query(prompt):
    api_key = os.environ.get('GEMINI_API_KEY')
    trimmed = prompt.strip() if prompt else ''
    if not trimmed:
        return {'success': False, 'error': 'Valid prompt string is required'}

    if api_key:
        try:
            context = retrieve_puja_knowledge(trimmed)
            context_summary = json.dumps({
                'relevantPandals': [{'name': p.get('name'), 'zone': p.get('zone'), 'metro': p.get('nearestMetro'), 'theme': p.get('theme'), 'artisan': p.get('artisan'), 'estYear': p.get('estYear'), 'bestTime': p.get('bestTime')} for p in context['allPandals']],
                'relevantEateries': [{'name': e.get('name'), 'cuisine': e.get('cuisine'), 'location': e.get('location'), 'price': e.get('avgPrice'), 'mustTry': e.get('mustTry'), 'timings': e.get('timings')} for e in context['allEateries']],
                'relevantSchedule': context['matchedSchedule']
            })

            endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
            system_instruction = (
                "You are 'Sharodiya', the AI Cultural Companion for Kolkata Durga Puja 2026.\n"
                "Provide accurate, precise, culturally authentic answers regarding 141 Pandals, 250 Eateries, Ritual Muhurats, and Kolkata Metro transit.\n"
                f"Grounding Data:\n{context_summary}"
            )

            payload = {
                "contents": [{"parts": [{"text": f"{system_instruction}\n\nUser Question: {trimmed}"}]}]
            }
            req_data = json.dumps(payload).encode('utf-8')
            req = urllib.request.Request(endpoint, data=req_data, headers={'Content-Type': 'application/json'})
            
            with urllib.request.urlopen(req, timeout=10) as response:
                if response.status == 200:
                    resp_json = json.loads(response.read().decode('utf-8'))
                    answer = resp_json.get('candidates', [{}])[0].get('content', {}).get('parts', [{}])[0].get('text')
                    if answer and answer.strip():
                        return {
                            'success': True,
                            'source': 'gemini-grounded',
                            'answer': answer.strip()
                        }
        except Exception as e:
            print(f"[AI] Gemini fallback to local engine: {e}")

    local_ans = generate_accurate_puja_answer(trimmed)
    return {
        'success': True,
        'source': 'sharodiya-knowledge-engine',
        'answer': local_ans
    }
