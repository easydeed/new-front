#!/usr/bin/env python3
"""
Test all the endpoints we fixed to verify they work
"""

import requests

def test_all_endpoints():
    print("🚀 Testing All DeedPro Endpoints After Fixes")
    print("=" * 60)
    
    BASE_URL = "https://deedpro-main-api.onrender.com"
    
    # 1. Login
    print("🔐 Testing login...")
    login_data = {
        "email": "test@deedpro-check.com",
        "password": "TestPassword123!"
    }
    
    try:
        login_response = requests.post(f"{BASE_URL}/users/login", json=login_data, timeout=10)
        login_response.raise_for_status()
        token = login_response.json().get("access_token")
        if not token:
            print("❌ Login failed")
            return
        print("✅ Login successful")
    except Exception as e:
        print(f"❌ Login failed: {e}")
        return

    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Test both pricing endpoints
    print("\n💰 Testing pricing endpoints...")
    
    # Test /pricing
    try:
        response = requests.get(f"{BASE_URL}/pricing", headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ /pricing endpoint works: Found {len(data)} plans")
        else:
            print(f"❌ /pricing failed: {response.status_code}")
    except Exception as e:
        print(f"❌ /pricing error: {e}")
    
    # Test /pricing/plans
    try:
        response = requests.get(f"{BASE_URL}/pricing/plans", headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ /pricing/plans endpoint works: Found {len(data)} plans")
        else:
            print(f"❌ /pricing/plans failed: {response.status_code}")
    except Exception as e:
        print(f"❌ /pricing/plans error: {e}")
    
    # 3. Test profile endpoint
    print("\n👤 Testing profile endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/users/profile", headers=headers, timeout=10)
        if response.status_code == 200:
            print("✅ Profile endpoint works")
        else:
            print(f"❌ Profile failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Profile error: {e}")
    
    # 4. Test AI assistance endpoint
    print("\n🤖 Testing AI assistance endpoint...")
    try:
        ai_data = {
            "field": "property_address",
            "input_text": "123 Main Street",
            "deed_type": "grant_deed"
        }
        response = requests.post(f"{BASE_URL}/api/ai/assist", json=ai_data, headers=headers, timeout=10)
        if response.status_code == 200:
            result = response.json()
            print(f"✅ AI assistance works: {result.get('suggestion', 'No suggestion')[:50]}...")
        else:
            print(f"❌ AI assistance failed: {response.status_code}")
    except Exception as e:
        print(f"❌ AI assistance error: {e}")
    
    # 5. Test deed preview with simpler data
    print("\n📄 Testing deed preview...")
    try:
        simple_deed_data = {
            "deed_type": "grant_deed",
            "data": {
                "grantor": "John Doe",
                "grantee": "Jane Smith",
                "county": "Los Angeles"
            }
        }
        response = requests.post(f"{BASE_URL}/generate-deed-preview", json=simple_deed_data, headers=headers, timeout=15)
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Deed preview works: Status = {result.get('status')}")
        else:
            error = response.json() if response.headers.get('content-type', '').startswith('application/json') else response.text
            print(f"❌ Deed preview failed: {response.status_code}")
            print(f"   Error: {error}")
    except Exception as e:
        print(f"❌ Deed preview error: {e}")
    
    print("\n" + "=" * 60)
    print("🎯 TESTING COMPLETE!")
    print("=" * 60)

if __name__ == "__main__":
    test_all_endpoints()
