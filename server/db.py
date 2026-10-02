import os
import json
import time
from datetime import datetime

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(CURRENT_DIR, '..', 'data')
DB_FILE = os.path.join(DATA_DIR, 'database.json')

DEFAULT_DB = {
    "parikramas": {},
    "squads": {},
    "crowdReports": {},
    "reviews": [],
    "routes": {}
}

class Database:
    def __init__(self):
        os.makedirs(DATA_DIR, exist_ok=True)
        self.db = self.load()

    def load(self):
        try:
            if os.path.exists(DB_FILE):
                with open(DB_FILE, 'r', encoding='utf-8') as f:
                    return json.load(f)
        except Exception as err:
            print(f"[DB] Failed to load database file, initializing default: {err}")
        initial = dict(DEFAULT_DB)
        self.save_direct(initial)
        return initial

    def save_direct(self, data):
        try:
            with open(DB_FILE, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2)
        except Exception as err:
            print(f"[DB] Failed to write database file: {err}")

    def save(self):
        self.save_direct(self.db)

    # --- PARIKRAMA & PLANS METHODS ---
    def get_parikrama(self, parikrama_id):
        return self.db.get("parikramas", {}).get(parikrama_id) or self.db.get("plans", {}).get(parikrama_id)

    def save_parikrama(self, parikrama_id, payload):
        if "parikramas" not in self.db:
            self.db["parikramas"] = {}
        if "plans" not in self.db:
            self.db["plans"] = {}
        existing = self.db["parikramas"].get(parikrama_id, {}) or self.db["plans"].get(parikrama_id, {})
        now = datetime.now().isoformat()
        entry = {
            **existing,
            **payload,
            "id": parikrama_id,
            "updatedAt": now,
            "createdAt": existing.get("createdAt", now)
        }
        self.db["parikramas"][parikrama_id] = entry
        self.db["plans"][parikrama_id] = entry
        self.save()
        return entry

    def list_parikramas(self, day=None):
        all_items = list(self.db.get("plans", {}).values())
        if not all_items:
            all_items = list(self.db.get("parikramas", {}).values())
        if day:
            return [p for p in all_items if (p.get("day") or '').lower() == day.lower()]
        return all_items

    def delete_plan(self, plan_id):
        deleted = False
        if "plans" in self.db and plan_id in self.db["plans"]:
            del self.db["plans"][plan_id]
            deleted = True
        if "parikramas" in self.db and plan_id in self.db["parikramas"]:
            del self.db["parikramas"][plan_id]
            deleted = True
        if deleted:
            self.save()
        return deleted

    # --- SQUAD METHODS ---
    def get_squad(self, code):
        if not code:
            return None
        normalized = str(code).upper().strip()
        return self.db.get("squads", {}).get(normalized)

    def create_squad(self, code, data=None):
        if data is None:
            data = {}
        normalized = str(code).upper().strip()
        now = datetime.now().isoformat()
        squad = {
            "code": normalized,
            "name": data.get("name") or f"Squad {normalized}",
            "archetype": data.get("archetype", "friends"),
            "members": data.get("members") or ["Captain (You)"],
            "checkins": data.get("checkins") or [],
            "sharedRoute": data.get("sharedRoute") or [],
            "createdAt": now,
            "updatedAt": now
        }
        if "squads" not in self.db:
            self.db["squads"] = {}
        self.db["squads"][normalized] = squad
        self.save()
        return squad

    def join_squad(self, code, member_name):
        squad = self.get_squad(code)
        if not squad:
            return None
        if member_name and member_name not in squad.get("members", []):
            squad.setdefault("members", []).append(member_name)
            squad["updatedAt"] = datetime.now().isoformat()
            self.save()
        return squad

    def add_squad_checkin(self, code, checkin_data):
        squad = self.get_squad(code)
        if not squad:
            return None
        checkin = {
            "id": f"chk_{int(time.time() * 1000)}",
            "entityType": checkin_data.get("entityType", "pandal"),
            "entityId": checkin_data.get("entityId"),
            "entityName": checkin_data.get("entityName"),
            "memberName": checkin_data.get("memberName", "Squad Member"),
            "note": checkin_data.get("note", ""),
            "checkedInAt": datetime.now().isoformat()
        }
        squad.setdefault("checkins", []).insert(0, checkin)
        squad["updatedAt"] = datetime.now().isoformat()
        self.save()
        return checkin

    # --- CROWD REPORT METHODS ---
    def add_crowd_report(self, pandal_id, report):
        if "crowdReports" not in self.db:
            self.db["crowdReports"] = {}
        if pandal_id not in self.db["crowdReports"]:
            self.db["crowdReports"][pandal_id] = []

        try:
            wait_min = int(report.get("waitMinutes", 20))
        except (ValueError, TypeError):
            wait_min = 20

        new_report = {
            "id": f"cr_{int(time.time() * 1000)}",
            "pandalId": pandal_id,
            "crowdLevel": report.get("crowdLevel", "Moderate"),
            "waitMinutes": wait_min,
            "note": report.get("note", ""),
            "reportedBy": report.get("reportedBy", "Devotee"),
            "reportedAt": datetime.now().isoformat()
        }
        self.db["crowdReports"][pandal_id].insert(0, new_report)
        if len(self.db["crowdReports"][pandal_id]) > 50:
            self.db["crowdReports"][pandal_id] = self.db["crowdReports"][pandal_id][:50]
        self.save()
        return new_report

    def get_crowd_reports(self, pandal_id):
        return self.db.get("crowdReports", {}).get(pandal_id, [])

    def get_live_crowd_summary(self, pandal_id):
        reports = self.get_crowd_reports(pandal_id)
        if not reports:
            return None
        latest = reports[0]
        recent = reports[:5]
        avg_wait = round(sum(r.get("waitMinutes", 20) for r in recent) / len(recent))
        return {
            "currentLevel": latest.get("crowdLevel", "Moderate"),
            "estimatedWaitMinutes": avg_wait,
            "totalReports": len(reports),
            "lastReportedAt": latest.get("reportedAt")
        }

    # --- REVIEWS METHODS ---
    def add_review(self, review_data):
        if "reviews" not in self.db:
            self.db["reviews"] = []

        try:
            rating = float(review_data.get("rating", 5.0))
        except (ValueError, TypeError):
            rating = 5.0

        review = {
            "id": f"rev_{int(time.time() * 1000)}",
            "entityType": review_data.get("entityType", "pandal"),
            "entityId": review_data.get("entityId"),
            "rating": rating,
            "comment": review_data.get("comment", ""),
            "userName": review_data.get("userName", "Devotee"),
            "createdAt": datetime.now().isoformat()
        }
        self.db["reviews"].insert(0, review)
        self.save()
        return review

    def get_reviews(self, entity_id):
        return [r for r in self.db.get("reviews", []) if r.get("entityId") == entity_id]

    # --- ROUTING CACHE METHODS ---
    def get_cached_route(self, route_hash):
        return self.db.get("routes", {}).get(route_hash)

    def save_cached_route(self, route_hash, route_data):
        if "routes" not in self.db:
            self.db["routes"] = {}
        # Keep cache manageable (max 200 routes)
        if len(self.db["routes"]) > 200:
            oldest_keys = list(self.db["routes"].keys())[:50]
            for k in oldest_keys:
                del self.db["routes"][k]
        self.db["routes"][route_hash] = route_data
        self.save()
        return route_data

db = Database()

