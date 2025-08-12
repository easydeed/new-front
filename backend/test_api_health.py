#!/usr/bin/env python3
"""
Test if the API is healthy after database fix
"""

import requests
import time

API_URL = "https://deedpro-main-api.onrender.com"

def test_api_health():
    print("=" * 60)
    print("🏥 Testing API Health After Database Fix")
    print("=" * 60)
    
    endpoints_to_test = [
        ("/health", "Health Check"),
        ("/docs", "API Documentation"),
        ("/", "Root Endpoint")
    ]
    
    for endpoint, description in endpoints_to_test:
        url = f"{API_URL}{endpoint}"
        print(f"\n🔍 Testing {description}: {endpoint}")
        
        try:
            response = requests.get(url, timeout=10)
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 200:
                print(f"   ✅ SUCCESS")
                if endpoint == "/health":
                    try:
                        data = response.json()
                        print(f"   Response: {data}")
                    except:
                        pass
            else:
                print(f"   ⚠️  Response: {response.status_code}")
                
        except Exception as e:
            print(f"   💥 ERROR: {str(e)}")
    
    # Wait a moment then test login
    print(f"\n⏳ Waiting 5 seconds for service to stabilize...")
    time.sleep(5)
    
    print(f"\n🔑 Testing Login Endpoint...")
    try:
        response = requests.post(f"{API_URL}/users/login", 
            json={"email": "test@deedpro-check.com", "password": "TestPassword123!"},
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            print(f"   ✅ LOGIN SUCCESS - Database fix worked!")
            data = response.json()
            if 'access_token' in data:
                print(f"   Token received: {data['access_token'][:50]}...")
        else:
            error_data = response.json() if response.headers.get('content-type') == 'application/json' else {}
            print(f"   ❌ LOGIN FAILED: {error_data.get('detail', response.text)}")
            
            if "SSL" in str(error_data) or "connection" in str(error_data).lower():
                print(f"   💡 Backend service may need restart to pick up database fix")
                
    except Exception as e:
        print(f"   💥 ERROR: {str(e)}")
        if "SSL" in str(e) or "connection" in str(e).lower():
            print(f"   💡 Backend service may need restart")

if __name__ == "__main__":
    test_api_health()
