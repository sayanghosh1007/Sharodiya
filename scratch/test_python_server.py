import urllib.request
import urllib.parse
import json
import time
import subprocess
import sys
import os

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

BASE_URL = "http://127.0.0.1:3000"

def run_tests():
    print("🧪 Running Sharodiya Python API Test Suite...\n")
    
    # 1. Health Check
    try:
        with urllib.request.urlopen(f"{BASE_URL}/api/health", timeout=5) as res:
            assert res.status == 200
            data = json.loads(res.read().decode('utf-8'))
            assert data.get('status') == 'online'
            print("  ✅ GET /api/health passed:", data.get('app'))
    except Exception as e:
        print("  ❌ GET /api/health failed:", e)
        return False

    # 2. Pandals List
    try:
        with urllib.request.urlopen(f"{BASE_URL}/api/pandals?zone=north", timeout=5) as res:
            assert res.status == 200
            data = json.loads(res.read().decode('utf-8'))
            assert data.get('success') is True
            assert len(data.get('pandals', [])) > 0
            print(f"  ✅ GET /api/pandals (North zone) passed: {len(data.get('pandals'))} pandals")
    except Exception as e:
        print("  ❌ GET /api/pandals failed:", e)
        return False

    # 3. Eateries List
    try:
        with urllib.request.urlopen(f"{BASE_URL}/api/eateries?category=midnight", timeout=5) as res:
            assert res.status == 200
            data = json.loads(res.read().decode('utf-8'))
            assert data.get('success') is True
            assert len(data.get('eateries', [])) > 0
            print(f"  ✅ GET /api/eateries (Midnight) passed: {len(data.get('eateries'))} eateries")
    except Exception as e:
        print("  ❌ GET /api/eateries failed:", e)
        return False

    # 4. Schedule
    try:
        with urllib.request.urlopen(f"{BASE_URL}/api/schedule", timeout=5) as res:
            assert res.status == 200
            data = json.loads(res.read().decode('utf-8'))
            assert data.get('success') is True
            assert data.get('totalDays') == 5
            print(f"  ✅ GET /api/schedule passed: 5 days")
    except Exception as e:
        print("  ❌ GET /api/schedule failed:", e)
        return False

    # 5. Itinerary Recommendation
    try:
        payload = json.dumps({
            "archetype": "friends",
            "day": "Maha Ashtami",
            "timeWindow": "midnight",
            "zone": "all",
            "cuisine": "biryani",
            "pace": "balanced"
        }).encode('utf-8')
        req = urllib.request.Request(f"{BASE_URL}/api/itinerary/recommend", data=payload, headers={'Content-Type': 'application/json'})
        with urllib.request.urlopen(req, timeout=5) as res:
            assert res.status == 200
            data = json.loads(res.read().decode('utf-8'))
            assert data.get('success') is True
            itin = data.get('itinerary', {})
            assert len(itin.get('items', [])) > 0
            print(f"  ✅ POST /api/itinerary/recommend passed: {len(itin.get('items'))} stops generated")
    except Exception as e:
        print("  ❌ POST /api/itinerary/recommend failed:", e)
        return False

    # 6. AI Cultural Companion
    try:
        payload = json.dumps({"prompt": "How to reach Sreebhumi by metro?"}).encode('utf-8')
        req = urllib.request.Request(f"{BASE_URL}/api/ai/companion", data=payload, headers={'Content-Type': 'application/json'})
        with urllib.request.urlopen(req, timeout=5) as res:
            assert res.status == 200
            data = json.loads(res.read().decode('utf-8'))
            assert data.get('success') is True
            assert len(data.get('answer', '')) > 20
            print("  ✅ POST /api/ai/companion (Transit/Metro) passed")
    except Exception as e:
        print("  ❌ POST /api/ai/companion failed:", e)
        return False

    # 7. Parikrama Save & Retrieve
    try:
        payload = json.dumps({
            "name": "Test Python Parikrama",
            "day": "Maha Ashtami",
            "items": [{"type": "pandal", "itemId": "bagbazar-sarbojonin-north", "name": "Bagbazar"}]
        }).encode('utf-8')
        req = urllib.request.Request(f"{BASE_URL}/api/parikramas", data=payload, headers={'Content-Type': 'application/json'})
        with urllib.request.urlopen(req, timeout=5) as res:
            assert res.status == 201
            data = json.loads(res.read().decode('utf-8'))
            par_id = data.get('id')
            assert par_id is not None
            print(f"  ✅ POST /api/parikramas passed: Created ID {par_id}")

        with urllib.request.urlopen(f"{BASE_URL}/api/parikramas/{par_id}", timeout=5) as res:
            assert res.status == 200
            data = json.loads(res.read().decode('utf-8'))
            assert data.get('parikrama', {}).get('name') == "Test Python Parikrama"
            print(f"  ✅ GET /api/parikramas/{par_id} passed")
    except Exception as e:
        print("  ❌ Parikrama save/retrieve failed:", e)
        return False

    # 8. Squad Room Creation & Join
    try:
        payload = json.dumps({
            "name": "Python Test Squad",
            "archetype": "friends",
            "captainName": "Sourav"
        }).encode('utf-8')
        req = urllib.request.Request(f"{BASE_URL}/api/squads", data=payload, headers={'Content-Type': 'application/json'})
        with urllib.request.urlopen(req, timeout=5) as res:
            assert res.status == 201
            data = json.loads(res.read().decode('utf-8'))
            code = data.get('code')
            assert code is not None
            print(f"  ✅ POST /api/squads passed: Code {code}")

        join_payload = json.dumps({"memberName": "Anirban"}).encode('utf-8')
        join_req = urllib.request.Request(f"{BASE_URL}/api/squads/{code}/join", data=join_payload, headers={'Content-Type': 'application/json'})
        with urllib.request.urlopen(join_req, timeout=5) as res:
            assert res.status == 200
            data = json.loads(res.read().decode('utf-8'))
            assert "Anirban" in data.get('squad', {}).get('members', [])
            print(f"  ✅ POST /api/squads/{code}/join passed")
    except Exception as e:
        print("  ❌ Squad endpoints failed:", e)
        return False

    print("\n🎉 ALL PYTHON BACKEND ENDPOINTS PASSED PERFECTLY!\n")
    return True

if __name__ == '__main__':
    run_tests()
