import urllib.request
import json
import time

BASE_URL = "http://localhost:3000/api"

def make_req(endpoint, method="GET", payload=None, token=None):
    url = f"{BASE_URL}{endpoint}"
    data = json.dumps(payload).encode('utf-8') if payload else None
    headers = {"Content-Type": "application/json"} if payload else {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=5) as res:
            return res.status, json.loads(res.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode('utf-8'))

def test_auth_flow():
    print("\n[TEST] AUTHENTICATION & DIRECT EMAIL/PASSWORD SIGN-IN LIFECYCLE\n")
    test_email = f"test_devotee_{int(time.time())}@sharodiya.in"
    test_password = "SecurePassword2026!"
    test_name = "Debolina Mukherjee"

    # Step 1: Create Account
    print("Step 1: Creating New User Account via /api/auth/register...")
    status, reg_res = make_req("/auth/register", "POST", {
        "name": test_name,
        "email": test_email,
        "password": test_password,
        "archetype": "friends"
    })
    assert status == 201, f"Expected 201 Created, got {status}: {reg_res}"
    assert reg_res.get("success") == True, "Registration must succeed"
    assert reg_res.get("user", {}).get("email") == test_email, "Email in user response must match"
    print(f"  [PASS] Account created successfully! User ID: {reg_res['user']['id']}, Token: {reg_res['token'][:15]}...")

    # Step 2: Direct Sign-In with Valid Email & Password
    print("\nStep 2: Directly Signing In next time with Email & Password via /api/auth/login...")
    status, login_res = make_req("/auth/login", "POST", {
        "email": test_email,
        "password": test_password
    })
    assert status == 200, f"Expected 200 OK, got {status}: {login_res}"
    assert login_res.get("success") == True, "Login must succeed"
    assert login_res.get("user", {}).get("name") == test_name, "User name must match"
    print(f"  [PASS] Direct sign-in succeeded! Welcome user: {login_res.get('user', {}).get('name')}")

    # Step 3: Sign-In with Incorrect Password (Should Fail)
    print("\nStep 3: Verifying Incorrect Password Rejection...")
    status, bad_pwd_res = make_req("/auth/login", "POST", {
        "email": test_email,
        "password": "WrongPassword123"
    })
    assert status == 401, f"Expected 401 Unauthorized, got {status}: {bad_pwd_res}"
    assert bad_pwd_res.get("success") == False, "Login with wrong password must fail"
    print(f"  [PASS] Incorrect password successfully rejected: '{bad_pwd_res.get('error')}'")

    # Step 4: Sign-In with Non-Existent Email (Should Fail)
    print("\nStep 4: Verifying Non-Existent Account Rejection...")
    status, not_found_res = make_req("/auth/login", "POST", {
        "email": "non_existent_devotee@randomdomain.org",
        "password": "AnyPassword123"
    })
    assert status == 401, f"Expected 401 Unauthorized, got {status}: {not_found_res}"
    assert not_found_res.get("success") == False, "Non-existent user sign-in must fail"
    print(f"  [PASS] Non-existent account rejected properly: '{not_found_res.get('error')}'")

    # Step 5: Duplicate Registration Check
    print("\nStep 5: Verifying Duplicate Email Prevention...")
    status, dup_res = make_req("/auth/register", "POST", {
        "name": "Duplicate Devotee",
        "email": test_email,
        "password": "AnotherPassword456"
    })
    assert status == 400, f"Expected 400 Bad Request, got {status}: {dup_res}"
    assert dup_res.get("success") == False, "Duplicate email registration must fail"
    print(f"  [PASS] Duplicate registration prevented: '{dup_res.get('error')}'")

    # Step 6: Delete Account (Cleanup)
    print("\nStep 6: Deleting Test Account via /api/auth/account...")
    status, del_res = make_req("/auth/account", "DELETE", token=login_res.get("token"))
    assert status == 200, f"Expected 200 OK, got {status}: {del_res}"
    assert del_res.get("success") == True, "Account deletion must succeed"
    print(f"  [PASS] Account deleted successfully: '{del_res.get('message')}'")

    print("\n[SUCCESS] ALL AUTHENTICATION & DIRECT SIGN-IN TESTS PASSED 100%!\n")

if __name__ == "__main__":
    test_auth_flow()
