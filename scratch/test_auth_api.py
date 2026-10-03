import urllib.request
import json
import sys

BASE_URL = 'http://localhost:3000'

def test_api():
    print("Testing Auth Endpoints...")
    
    # 1. Register test user
    reg_data = {
        "name": "Anirban Mukherjee",
        "email": f"anirban_{int(__import__('time').time())}@kolkatapujo.in",
        "password": "pujopassword123",
        "archetype": "friends",
        "avatar": "https://api.dicebear.com/7.x/bottts/svg?seed=Anirban"
    }
    req = urllib.request.Request(
        f"{BASE_URL}/api/auth/register",
        data=json.dumps(reg_data).encode('utf-8'),
        headers={'Content-Type': 'application/json'},
        method='POST'
    )
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode('utf-8'))
        assert res['success'] is True, f"Register failed: {res}"
        token = res['token']
        user = res['user']
        print(f"✅ Register Passed: {user['name']} ({user['email']}), Token: {token[:12]}...")

    # 2. Verify Session (GET /api/auth/me)
    req = urllib.request.Request(
        f"{BASE_URL}/api/auth/me",
        headers={'Authorization': f'Bearer {token}'},
        method='GET'
    )
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode('utf-8'))
        assert res['success'] is True, f"Auth me failed: {res}"
        assert res['user']['email'] == reg_data['email']
        print(f"✅ GET /api/auth/me Passed: {res['user']['name']}")

    # 3. Update Profile (PUT /api/auth/profile)
    update_data = {
        "name": "Anirban Mukherjee (VIP Guide)",
        "archetype": "photographers"
    }
    req = urllib.request.Request(
        f"{BASE_URL}/api/auth/profile",
        data=json.dumps(update_data).encode('utf-8'),
        headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {token}'},
        method='PUT'
    )
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode('utf-8'))
        assert res['success'] is True, f"Profile update failed: {res}"
        assert res['user']['name'] == "Anirban Mukherjee (VIP Guide)"
        assert res['user']['archetype'] == "photographers"
        print(f"✅ PUT /api/auth/profile Passed: {res['user']['name']} ({res['user']['archetype']})")

    # 4. Login (POST /api/auth/login)
    login_data = {
        "email": reg_data['email'],
        "password": "pujopassword123"
    }
    req = urllib.request.Request(
        f"{BASE_URL}/api/auth/login",
        data=json.dumps(login_data).encode('utf-8'),
        headers={'Content-Type': 'application/json'},
        method='POST'
    )
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode('utf-8'))
        assert res['success'] is True, f"Login failed: {res}"
        new_token = res['token']
        print(f"✅ POST /api/auth/login Passed: Token {new_token[:12]}...")

    # 5. Logout (POST /api/auth/logout)
    req = urllib.request.Request(
        f"{BASE_URL}/api/auth/logout",
        data=b'{}',
        headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {new_token}'},
        method='POST'
    )
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode('utf-8'))
        assert res['success'] is True
        print(f"✅ POST /api/auth/logout Passed")

    # 6. Verify token is invalidated
    try:
        req = urllib.request.Request(
            f"{BASE_URL}/api/auth/me",
            headers={'Authorization': f'Bearer {new_token}'},
            method='GET'
        )
        urllib.request.urlopen(req)
        assert False, "Token should be invalidated"
    except urllib.error.HTTPError as e:
        assert e.code == 401
        print("✅ Invalidation check Passed (returned 401)")

    print("\n🎉 ALL AUTH BACKEND TESTS PASSED 100%!")

if __name__ == '__main__':
    test_api()
