import os
import sys
import json
import mimetypes
import urllib.parse
from http.server import HTTPServer, SimpleHTTPRequestHandler
from socketserver import ThreadingMixIn
from datetime import datetime

# Ensure UTF-8 output on Windows consoles
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.abspath(os.path.join(CURRENT_DIR, '..'))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from db import db
from data_store import PANDALS_DATA, EATERIES_DATA, METRO_STATIONS_DATA, RITUAL_SCHEDULE, COMPANION_ARCHETYPES
from ai_engine import handle_ai_companion_query
from routing_engine import compute_road_route

PORT = int(os.environ.get('PORT', 3000))

# Ensure correct MIME types
mimetypes.add_type('application/javascript', '.js')
mimetypes.add_type('text/css', '.css')
mimetypes.add_type('application/json', '.json')
mimetypes.add_type('image/svg+xml', '.svg')

class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True

class SharodiyaRequestHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT_DIR, **kwargs)

    def log_message(self, format, *args):
        # Clean logging for API endpoints
        if self.path.startswith('/api'):
            print(f"[{datetime.now().strftime('%H:%M:%S')}] {self.command} {self.path}")

    def _send_cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def _send_json_response(self, data, status=200):
        body = json.dumps(data, indent=2).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self._send_cors_headers()
        self.end_headers()
        self.wfile.write(body)

    def _read_json_body(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length > 0:
                raw = self.rfile.read(content_length).decode('utf-8')
                return json.loads(raw)
        except Exception as e:
            print(f"[Server] Error parsing JSON body: {e}")
        return {}

    def do_OPTIONS(self):
        self.send_response(204)
        self._send_cors_headers()
        self.end_headers()

    # --- GET REQUEST ROUTER ---
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query_params = urllib.parse.parse_qs(parsed.query)

        # 1. Health Check
        if path == '/api/health':
            return self._send_json_response({
                'status': 'online',
                'app': 'Sharodiya - Python Durga Puja Experience Server',
                'version': '3.0.0',
                'language': 'Python 3.14',
                'timestamp': datetime.now().isoformat()
            })

        # 2. Schedule
        if path == '/api/schedule':
            day_param = query_params.get('day', [None])[0]
            if day_param:
                match = next((d for d in RITUAL_SCHEDULE if d.get('day', '').lower() == day_param.lower()), None)
                if not match:
                    return self._send_json_response({'success': False, 'error': 'Schedule day not found'}, 404)
                return self._send_json_response({'success': True, 'daySchedule': match})
            return self._send_json_response({
                'success': True,
                'totalDays': len(RITUAL_SCHEDULE),
                'schedule': RITUAL_SCHEDULE
            })

        # 3. Pandals List
        if path == '/api/pandals':
            zone = query_params.get('zone', ['all'])[0]
            category = query_params.get('category', ['all'])[0]
            search = query_params.get('search', [''])[0]
            sort_by = query_params.get('sort', [''])[0]

            results = list(PANDALS_DATA)

            if zone and zone != 'all':
                results = [p for p in results if p.get('zoneKey', '').lower() == zone.lower()]

            if category and category != 'all':
                results = [p for p in results if (isinstance(p.get('category'), list) and category in p.get('category')) or p.get('category') == category]

            if search:
                q = search.lower().strip()
                results = [p for p in results if
                           q in p.get('name', '').lower() or
                           q in p.get('location', '').lower() or
                           q in p.get('theme', '').lower() or
                           q in p.get('nearestMetro', '').lower() or
                           q in p.get('artisan', '').lower()]

            enhanced = []
            for p in results:
                live_crowd = db.get_live_crowd_summary(p.get('id'))
                p_copy = dict(p)
                p_copy['liveCrowd'] = live_crowd or {
                    'currentLevel': p.get('crowdLevel', 'Moderate'),
                    'estimatedWaitMinutes': int(p.get('queueTime', '20').split()[0]) if p.get('queueTime', '').split() and p.get('queueTime', '').split()[0].isdigit() else 20,
                    'totalReports': 0
                }
                enhanced.append(p_copy)

            if sort_by == 'rating':
                enhanced.sort(key=lambda x: x.get('rating', 0), reverse=True)
            elif sort_by == 'wait':
                enhanced.sort(key=lambda x: x.get('liveCrowd', {}).get('estimatedWaitMinutes', 999))

            return self._send_json_response({
                'success': True,
                'total': len(enhanced),
                'pandals': enhanced
            })

        # 4. Single Pandal Detail
        if path.startswith('/api/pandals/'):
            pandal_id = path.replace('/api/pandals/', '').strip().lower()
            pandal = next((p for p in PANDALS_DATA if p.get('id', '').lower() == pandal_id or pandal_id in p.get('id', '').lower()), None)
            if not pandal:
                return self._send_json_response({'success': False, 'error': 'Pandal not found'}, 404)

            live_crowd = db.get_live_crowd_summary(pandal.get('id'))
            recent_reports = db.get_crowd_reports(pandal.get('id'))
            reviews = db.get_reviews(pandal.get('id'))

            p_copy = dict(pandal)
            p_copy['liveCrowd'] = live_crowd or {
                'currentLevel': pandal.get('crowdLevel', 'Moderate'),
                'estimatedWaitMinutes': int(pandal.get('queueTime', '20').split()[0]) if pandal.get('queueTime', '').split() and pandal.get('queueTime', '').split()[0].isdigit() else 20,
                'totalReports': 0
            }
            p_copy['recentCrowdReports'] = recent_reports
            p_copy['reviews'] = reviews

            return self._send_json_response({
                'success': True,
                'pandal': p_copy
            })

        # 5. Eateries List
        if path == '/api/eateries':
            category = query_params.get('category', ['all'])[0]
            cuisine = query_params.get('cuisine', [''])[0]
            search = query_params.get('search', [''])[0]
            featured = query_params.get('featured', [''])[0]
            sort_by = query_params.get('sort', [''])[0]

            results = list(EATERIES_DATA)

            if category and category != 'all':
                results = [e for e in results if e.get('category') == category]

            if cuisine:
                c = cuisine.lower()
                results = [e for e in results if c in e.get('cuisine', '').lower()]

            if featured == 'true':
                results = [e for e in results if e.get('isFeatured')]

            if search:
                q = search.lower().strip()
                results = [e for e in results if
                           q in e.get('name', '').lower() or
                           q in e.get('location', '').lower() or
                           q in e.get('cuisine', '').lower() or
                           q in e.get('tagline', '').lower() or
                           any(q in m.lower() for m in e.get('mustTry', []))]

            if sort_by == 'rating':
                results.sort(key=lambda x: x.get('rating', 0), reverse=True)
            elif sort_by == 'reviews':
                results.sort(key=lambda x: x.get('reviews', 0), reverse=True)

            return self._send_json_response({
                'success': True,
                'total': len(results),
                'eateries': results
            })

        # 6. Single Eatery Detail
        if path.startswith('/api/eateries/'):
            eatery_id = path.replace('/api/eateries/', '').strip().lower()
            eatery = next((e for e in EATERIES_DATA if e.get('id', '').lower() == eatery_id or eatery_id in e.get('id', '').lower()), None)
            if not eatery:
                return self._send_json_response({'success': False, 'error': 'Eatery not found'}, 404)

            e_copy = dict(eatery)
            e_copy['reviews'] = db.get_reviews(eatery.get('id'))
            return self._send_json_response({
                'success': True,
                'eatery': e_copy
            })

        # 7. Parikramas & Plans List
        if path == '/api/parikramas' or path == '/api/plans':
            day_filter = query_params.get('day', [None])[0]
            list_par = db.list_parikramas(day=day_filter)
            return self._send_json_response({
                'success': True,
                'total': len(list_par),
                'parikramas': list_par,
                'plans': list_par
            })

        # 8. Single Parikrama or Plan Detail
        if path.startswith('/api/parikramas/') or path.startswith('/api/plans/'):
            par_id = path.replace('/api/parikramas/', '').replace('/api/plans/', '').strip()
            par = db.get_parikrama(par_id)
            if not par:
                return self._send_json_response({'success': False, 'error': 'Plan / Parikrama not found'}, 404)
            return self._send_json_response({'success': True, 'parikrama': par, 'plan': par})

        # 9. Squad Details
        if path.startswith('/api/squads/'):
            code = path.replace('/api/squads/', '').strip().upper()
            squad = db.get_squad(code)
            if not squad:
                return self._send_json_response({'success': False, 'error': 'Squad code not found'}, 404)
            return self._send_json_response({'success': True, 'squad': squad})

        # 10. Kolkata Metro Stations
        if path == '/api/metro':
            line_param = query_params.get('line', [''])[0]
            search = query_params.get('search', [''])[0]
            results = list(METRO_STATIONS_DATA)
            if line_param:
                results = [m for m in results if line_param.lower() in m.get('line', '').lower()]
            if search:
                q = search.lower().strip()
                results = [m for m in results if q in m.get('name', '').lower() or q in m.get('landmark', '').lower()]
            return self._send_json_response({
                'success': True,
                'total': len(results),
                'metroStations': results
            })

        # 11. Map Configuration & Status
        if path == '/api/map/config' or path == '/api/map/summary':
            return self._send_json_response({
                'success': True,
                'mapEngine': 'Leaflet / OpenStreetMap / CartoDB',
                'apiKeyRequired': False,
                'apiKeyStatus': 'Not required - 100% Free Open-Access Geodata',
                'bounds': {
                    'southWest': [22.28, 88.08],
                    'northEast': [22.88, 88.62],
                    'outskirtsRegion': 'Greater Kolkata (Barrackpore/Kalyani to Baruipur/Sonarpur & Howrah to Barasat/New Town)'
                },
                'zoomLimits': {
                    'minZoom': 11,
                    'maxZoom': 19,
                    'defaultCenter': [22.5650, 88.3650],
                    'defaultZoom': 12
                },
                'tileProviders': {
                    'dark': 'https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
                    'light': 'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
                    'fallback': 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
                },
                'counts': {
                    'pandals': len(PANDALS_DATA),
                    'eateries': len(EATERIES_DATA),
                    'metroStations': len(METRO_STATIONS_DATA)
                }
            })

        # 12. Real Road Navigation Route
        if path == '/api/route':
            wp_str = query_params.get('waypoints', [''])[0]
            mode = query_params.get('mode', ['driving'])[0]
            if not wp_str:
                return self._send_json_response({'success': False, 'error': 'Missing waypoints parameter (format: lat1,lng1;lat2,lng2...)'}, 400)
            wps = []
            for pair in wp_str.split(';'):
                parts = pair.split(',')
                if len(parts) >= 2:
                    try:
                        wps.append({'lat': float(parts[0]), 'lng': float(parts[1])})
                    except ValueError:
                        pass
            res = compute_road_route(wps, mode=mode, db_instance=db)
            return self._send_json_response(res)

        # Catch-all for API 404
        if path.startswith('/api/'):
            return self._send_json_response({'success': False, 'error': 'API endpoint not found'}, 404)

        # Fallback to serving static files or index.html
        return super().do_GET()

    # --- POST REQUEST ROUTER ---
    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        body = self._read_json_body()

        # 0. Real Road Navigation Route POST
        if path == '/api/route':
            waypoints = body.get('waypoints', [])
            mode = body.get('mode', 'driving')
            stop_ids = body.get('stopIds', [])

            if not waypoints and stop_ids:
                waypoints = []
                for s_id in stop_ids:
                    p = next((p for p in PANDALS_DATA if p.get('id') == s_id), None)
                    if p and p.get('coordinates'):
                        waypoints.append(p['coordinates'])
                    else:
                        e = next((e for e in EATERIES_DATA if e.get('id') == s_id), None)
                        if e and e.get('coordinates'):
                            waypoints.append(e['coordinates'])
                        else:
                            m = next((m for m in METRO_STATIONS_DATA if m.get('id') == s_id), None)
                            if m and m.get('coordinates'):
                                waypoints.append(m['coordinates'])

            res = compute_road_route(waypoints, mode=mode, db_instance=db)
            return self._send_json_response(res)

        # 1. AI Cultural Companion
        if path == '/api/ai/companion':
            prompt = body.get('prompt', '')
            res = handle_ai_companion_query(prompt)
            return self._send_json_response(res)

        # 2. Itinerary Recommendation (Day-Aware)
        if path == '/api/itinerary/recommend':
            archetype = body.get('archetype', 'friends')
            day = body.get('day', 'Maha Sasthi')
            time_window = body.get('timeWindow', 'midnight')
            zone = body.get('zone', 'all')
            cuisine = body.get('cuisine', 'biryani')
            pace = body.get('pace', 'balanced')

            target_pandals = 3 if pace == 'relaxed' else (7 if pace == 'intense' else 5)
            target_eateries = 1 if pace == 'relaxed' else 2

            candidate_pandals = list(PANDALS_DATA)
            if zone and zone != 'all':
                candidate_pandals = [p for p in candidate_pandals if p.get('zoneKey') == zone.lower()]
            if len(candidate_pandals) < target_pandals:
                candidate_pandals = list(PANDALS_DATA)

            # Day context definition
            day_context_map = {
                'Maha Sasthi': {
                    'ritualName': 'Bodhon & Adhibas',
                    'themeBoost': ['theme', 'popular', 'lighting'],
                    'zoneBoost': 'north',
                    'notePrefix': '🌸 [Maha Sasthi Bodhon]'
                },
                'Maha Saptami': {
                    'ritualName': 'Nabapatrika (Kola Bou) Snan',
                    'themeBoost': ['traditional', 'sabeki'],
                    'zoneBoost': 'north',
                    'notePrefix': '🌿 [Maha Saptami Nabapatrika]'
                },
                'Maha Ashtami': {
                    'ritualName': 'Pushpanjali & Sandhi Puja',
                    'themeBoost': ['traditional', 'sabeki', 'popular'],
                    'zoneBoost': 'south',
                    'notePrefix': '🪔 [Maha Ashtami Sandhi & Anjali]'
                },
                'Maha Navami': {
                    'ritualName': 'Maha Arati & Dhunuchi Naach',
                    'themeBoost': ['lighting', 'theme', 'popular'],
                    'zoneBoost': 'south',
                    'notePrefix': '🔥 [Maha Navami Dhunuchi & Illuminations]'
                },
                'Bijoya Dashami': {
                    'ritualName': 'Sindoor Khela & Bisorjon',
                    'themeBoost': ['traditional', 'sabeki', 'eco'],
                    'zoneBoost': 'central',
                    'notePrefix': '🌺 [Bijoya Dashami Sindoor Khela & Bisorjon]'
                }
            }
            day_ctx = day_context_map.get(day, day_context_map['Maha Sasthi'])

            # Score pandals based on day context + archetype
            scored_pandals = []
            for p in candidate_pandals:
                score = 0
                cats = p.get('category', []) if isinstance(p.get('category'), list) else [p.get('category')]
                
                # Day boost
                if any(c in cats for c in day_ctx['themeBoost']): score += 4
                if p.get('zoneKey') == day_ctx['zoneBoost']: score += 3

                if archetype == 'friends':
                    if 'theme' in cats: score += 6
                    if 'lighting' in cats: score += 5
                    if 'popular' in cats: score += 4
                elif archetype == 'family':
                    if 'traditional' in cats: score += 8
                    if 'sabeki' in cats: score += 6
                    if 'eco' in cats: score += 4
                elif archetype == 'couple':
                    if 'lighting' in cats: score += 7
                    if 'lake' in p.get('location', '').lower() or 'park' in p.get('location', '').lower(): score += 6
                elif archetype in ('solo', 'culture'):
                    if 'theme' in cats: score += 6
                    if p.get('zoneKey') == 'north': score += 4

                day_seed = (len(day) * 13 + len(p.get('name', '')) * 7) % 11
                score += day_seed
                scored_pandals.append((p, score))

            scored_pandals.sort(key=lambda x: x[1], reverse=True)
            selected_pandals = [sp[0] for sp in scored_pandals[:target_pandals]]

            # Filter eateries
            candidate_eateries = list(EATERIES_DATA)
            if cuisine == 'biryani':
                candidate_eateries = [e for e in candidate_eateries if e.get('category') == 'midnight' or 'biryani' in e.get('cuisine', '').lower() or 'mughlai' in e.get('cuisine', '').lower()]
            elif cuisine == 'bengali':
                candidate_eateries = [e for e in candidate_eateries if e.get('category') == 'traditional' or 'bengali' in e.get('cuisine', '').lower() or 'thali' in e.get('cuisine', '').lower()]
            elif cuisine == 'street':
                candidate_eateries = [e for e in candidate_eateries if e.get('category') == 'street' or 'fry' in e.get('cuisine', '').lower() or 'chop' in e.get('cuisine', '').lower()]
            elif cuisine == 'sweets':
                candidate_eateries = [e for e in candidate_eateries if e.get('category') == 'cafes' or 'sandesh' in e.get('cuisine', '').lower() or 'sweet' in e.get('cuisine', '').lower()]
            elif cuisine == 'finedine':
                candidate_eateries = [e for e in candidate_eateries if e.get('category') == 'finedine']

            if len(candidate_eateries) < target_eateries:
                candidate_eateries = list(EATERIES_DATA)

            candidate_eateries.sort(key=lambda x: x.get('rating', 0), reverse=True)
            selected_eateries = candidate_eateries[:target_eateries]

            # Build timeline
            start_hour_map = {'morning': 8, 'afternoon': 13, 'evening': 17, 'midnight': 23, 'allday': 9}
            curr_h = start_hour_map.get(time_window, 17)
            curr_m = 0

            def fmt_slot(sh, sm, dur):
                end_tot = (sh * 60 + sm + dur) % (24 * 60)
                eh = end_tot // 60
                em = end_tot % 60
                def fmt_single(h, m):
                    period = 'PM' if 12 <= h < 24 else 'AM'
                    dh = 12 if h % 12 == 0 else h % 12
                    return f"{dh:02d}:{m:02d} {period}"
                return f"{fmt_single(sh, sm)} - {fmt_single(eh, em)}"

            itinerary_items = []
            p_idx, e_idx = 0, 0
            total_stops = len(selected_pandals) + len(selected_eateries)
            food_points = [len(selected_pandals) // 2] if len(selected_eateries) == 1 else [2, len(selected_pandals)]
            p_count = 0

            for i in range(total_stops):
                if p_count in food_points and e_idx < len(selected_eateries):
                    eat = selected_eateries[e_idx]
                    e_idx += 1
                    dur = 60
                    ts = fmt_slot(curr_h, curr_m, dur)
                    itinerary_items.append({
                        'id': f"gen_e_{int(datetime.now().timestamp())}_{e_idx}",
                        'type': 'eatery',
                        'itemId': eat.get('id'),
                        'name': f"{eat.get('name')} ({eat.get('outlet', '')})",
                        'zone': eat.get('location'),
                        'timeSlot': ts,
                        'distanceFromPrev': '1.2 km (Transit / Walk)',
                        'duration': f"{dur} mins",
                        'notes': f"{day} Dining: Must-try {', '.join(eat.get('mustTry', [])[:2])} ({eat.get('avgPrice')}).",
                        'details': eat
                    })
                    new_tot = (curr_h * 60 + curr_m + dur + 15) % (24 * 60)
                    curr_h, curr_m = new_tot // 60, new_tot % 60
                elif p_idx < len(selected_pandals):
                    pan = selected_pandals[p_idx]
                    p_idx += 1
                    p_count += 1
                    dur = 75
                    ts = fmt_slot(curr_h, curr_m, dur)
                    itinerary_items.append({
                        'id': f"gen_p_{int(datetime.now().timestamp())}_{p_idx}",
                        'type': 'pandal',
                        'itemId': pan.get('id'),
                        'name': pan.get('name'),
                        'zone': pan.get('location'),
                        'timeSlot': ts,
                        'distanceFromPrev': '0 km (Starting Point)' if p_idx == 1 else '1.8 km (Metro / Walk)',
                        'duration': f"{dur} mins",
                        'notes': f"{day_ctx['notePrefix']} Theme: {pan.get('theme')}. Nearest Metro: {pan.get('nearestMetro')}.",
                        'details': pan
                    })
                    new_tot = (curr_h * 60 + curr_m + dur + 20) % (24 * 60)
                    curr_h, curr_m = new_tot // 60, new_tot % 60

            # Calculate real road navigation geometry
            wps = []
            for item in itinerary_items:
                coords = item.get('details', {}).get('coordinates')
                if coords:
                    wps.append(coords)

            road_route = compute_road_route(wps, mode='driving', db_instance=db) if len(wps) >= 2 else None
            actual_dist_km = road_route.get('totalDistanceKm') if road_route and road_route.get('success') else round(len(itinerary_items) * 2.2, 1)
            actual_dur_mins = road_route.get('totalDurationMins') if road_route and road_route.get('success') else round(len(itinerary_items) * 1.4 * 60)

            return self._send_json_response({
                'success': True,
                'itinerary': {
                    'options': body,
                    'day': day,
                    'ritualName': day_ctx['ritualName'],
                    'archetype': archetype,
                    'timeWindow': time_window,
                    'zone': zone,
                    'cuisine': cuisine,
                    'pace': pace,
                    'items': itinerary_items,
                    'totalEstDistance': f"{actual_dist_km} km",
                    'totalEstHours': f"{actual_dur_mins / 60.0:.1f}",
                    'totalDurationMins': actual_dur_mins,
                    'roadRoute': road_route,
                    'totalPandals': len(selected_pandals),
                    'totalEateries': len(selected_eateries)
                }
            })

        # 3. Pandal Crowd Report
        if path.startswith('/api/pandals/') and path.endswith('/crowd-report'):
            pandal_id = path.replace('/api/pandals/', '').replace('/crowd-report', '').strip()
            pandal = next((p for p in PANDALS_DATA if p.get('id', '').lower() == pandal_id.lower()), None)
            if not pandal:
                return self._send_json_response({'success': False, 'error': 'Pandal not found'}, 404)

            crowd_level = body.get('crowdLevel')
            if not crowd_level:
                return self._send_json_response({'success': False, 'error': 'crowdLevel is required'}, 400)

            report = db.add_crowd_report(pandal.get('id'), body)
            live_summary = db.get_live_crowd_summary(pandal.get('id'))
            return self._send_json_response({
                'success': True,
                'message': 'Crowd report recorded successfully',
                'report': report,
                'liveSummary': live_summary
            }, 201)

        # 4. Pandal Review
        if path.startswith('/api/pandals/') and path.endswith('/reviews'):
            pandal_id = path.replace('/api/pandals/', '').replace('/reviews', '').strip()
            pandal = next((p for p in PANDALS_DATA if p.get('id', '').lower() == pandal_id.lower()), None)
            if not pandal:
                return self._send_json_response({'success': False, 'error': 'Pandal not found'}, 404)

            review = db.add_review({
                'entityType': 'pandal',
                'entityId': pandal.get('id'),
                'rating': body.get('rating', 5.0),
                'comment': body.get('comment', ''),
                'userName': body.get('userName', 'Devotee')
            })
            return self._send_json_response({'success': True, 'message': 'Review added', 'review': review}, 201)

        # 5. Eatery Review
        if path.startswith('/api/eateries/') and path.endswith('/reviews'):
            eatery_id = path.replace('/api/eateries/', '').replace('/reviews', '').strip()
            eatery = next((e for e in EATERIES_DATA if e.get('id', '').lower() == eatery_id.lower()), None)
            if not eatery:
                return self._send_json_response({'success': False, 'error': 'Eatery not found'}, 404)

            review = db.add_review({
                'entityType': 'eatery',
                'entityId': eatery.get('id'),
                'rating': body.get('rating', 5.0),
                'comment': body.get('comment', ''),
                'userName': body.get('userName', 'Devotee')
            })
            return self._send_json_response({'success': True, 'message': 'Review recorded', 'review': review}, 201)

        # 6. Save Parikrama or Plan
        if path == '/api/parikramas' or path == '/api/plans':
            items = body.get('items', [])
            if not isinstance(items, list):
                items = []

            par_id = body.get('id') or f"plan_{os.urandom(4).hex()}"
            day_val = body.get('day') # can be None / string
            par = db.save_parikrama(par_id, {
                'id': par_id,
                'name': body.get('name', 'My Puja Plan'),
                'day': day_val,
                'squad': body.get('squad', 'friends'),
                'items': items,
                'description': body.get('description', ''),
                'createdBy': body.get('createdBy', 'Devotee'),
                'shareUrl': f"/parikrama/{par_id}"
            })
            return self._send_json_response({
                'success': True,
                'message': f"Plan '{par.get('name')}' saved successfully",
                'id': par_id,
                'parikrama': par,
                'plan': par
            }, 201)

        # 7. Create Squad
        if path == '/api/squads':
            gen_code = f"SHARODIYA-{os.urandom(3).hex().upper()}"
            squad = db.create_squad(gen_code, {
                'name': body.get('name') or f"Squad {gen_code}",
                'archetype': body.get('archetype', 'friends'),
                'members': [body.get('captainName', 'Captain (You)')],
                'sharedRoute': body.get('sharedRoute', [])
            })
            return self._send_json_response({
                'success': True,
                'message': 'Squad created successfully',
                'code': gen_code,
                'squad': squad
            }, 201)

        # 8. Join Squad
        if path.startswith('/api/squads/') and path.endswith('/join'):
            code = path.replace('/api/squads/', '').replace('/join', '').strip().upper()
            member_name = body.get('memberName')
            if not member_name:
                return self._send_json_response({'success': False, 'error': 'memberName is required'}, 400)
            squad = db.join_squad(code, member_name)
            if not squad:
                return self._send_json_response({'success': False, 'error': 'Squad code not found'}, 404)
            return self._send_json_response({'success': True, 'message': f"Joined squad {squad.get('code')}!", 'squad': squad})

        # 9. Squad Checkin
        if path.startswith('/api/squads/') and path.endswith('/checkin'):
            code = path.replace('/api/squads/', '').replace('/checkin', '').strip().upper()
            if not body.get('entityId') or not body.get('entityName'):
                return self._send_json_response({'success': False, 'error': 'entityId and entityName are required'}, 400)
            checkin = db.add_squad_checkin(code, body)
            if not checkin:
                return self._send_json_response({'success': False, 'error': 'Squad code not found'}, 404)
            squad = db.get_squad(code)
            return self._send_json_response({
                'success': True,
                'message': f"Checked in at {body.get('entityName')}!",
                'checkin': checkin,
                'squad': squad
            }, 201)

        return self._send_json_response({'success': False, 'error': 'Endpoint not found'}, 404)

    # --- PUT REQUEST ROUTER ---
    def do_PUT(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        body = self._read_json_body()

        if path.startswith('/api/parikramas/') or path.startswith('/api/plans/'):
            par_id = path.replace('/api/parikramas/', '').replace('/api/plans/', '').strip()
            existing = db.get_parikrama(par_id)
            if not existing:
                return self._send_json_response({'success': False, 'error': 'Plan / Parikrama not found'}, 404)
            updated = db.save_parikrama(par_id, body)
            return self._send_json_response({'success': True, 'message': 'Plan updated successfully', 'parikrama': updated, 'plan': updated})

        return self._send_json_response({'success': False, 'error': 'Endpoint not found'}, 404)

    # --- DELETE REQUEST ROUTER ---
    def do_DELETE(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path.startswith('/api/parikramas/') or path.startswith('/api/plans/'):
            par_id = path.replace('/api/parikramas/', '').replace('/api/plans/', '').strip()
            deleted = db.delete_plan(par_id)
            if not deleted:
                return self._send_json_response({'success': False, 'error': 'Plan / Parikrama not found'}, 404)
            return self._send_json_response({'success': True, 'message': 'Plan deleted successfully', 'id': par_id})

        return self._send_json_response({'success': False, 'error': 'Endpoint not found'}, 404)

def run_server():
    server_address = ('', PORT)
    httpd = ThreadedHTTPServer(server_address, SharodiyaRequestHandler)
    print(f"\n==================================================")
    print(f"🕉️ SHARODIYA FULL-STACK PYTHON SERVER RUNNING")
    print(f"🚀 URL: http://localhost:{PORT}")
    print(f"📡 API Health: http://localhost:{PORT}/api/health")
    print(f"🏛️ 141 Pandals: http://localhost:{PORT}/api/pandals")
    print(f"🍽️ 250 Eateries: http://localhost:{PORT}/api/eateries")
    print(f"==================================================\n")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server gracefully...")
        httpd.server_close()

if __name__ == '__main__':
    run_server()
