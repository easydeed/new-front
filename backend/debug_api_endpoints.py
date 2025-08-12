#!/usr/bin/env python3
"""
Debug API endpoints to see what's available and working
"""

import requests
import json

API_URL = "https://deedpro-api.onrender.com"

def test_endpoint(method, path, data=None):
    """Test a specific API endpoint"""
    url = f"{API_URL}{path}"
    print(f"\n🔍 Testing: {method} {url}")
    
    try:
        if method == "GET":
            response = requests.get(url)
        elif method == "POST":
            response = requests.post(url, json=data, headers={"Content-Type": "application/json"})
        else:
            print(f"   ❌ Unsupported method: {method}")
            return
        
        print(f"   Status: {response.status_code}")
        print(f"   Headers: {dict(response.headers)}")
        
        if response.headers.get('content-type', '').startswith('application/json'):
            try:
                data = response.json()
                print(f"   Response: {json.dumps(data, indent=2)}")
            except:
                print(f"   Raw Response: {response.text[:200]}...")
        else:
            print(f"   Raw Response: {response.text[:200]}...")
            
    except Exception as e:
        print(f"   💥 ERROR: {str(e)}")

def main():
    print("=" * 60)
    print("🔍 DeedPro API Endpoint Debug")
    print("=" * 60)
    
    # Test basic endpoints
    endpoints_to_test = [
        ("GET", "/"),           # Root
        ("GET", "/docs"),       # API docs
        ("GET", "/health"),     # Health check
        ("GET", "/ping"),       # Ping
        ("POST", "/login"),     # Login (should fail but show proper error)
        ("POST", "/register"),  # Register (should fail but show proper error)
        ("POST", "/auth/login"), # Maybe auth prefix?
        ("POST", "/api/login"),  # Maybe api prefix?
        ("POST", "/users/login"), # Maybe users prefix?
    ]
    
    print(f"🌐 Testing against: {API_URL}")
    
    for method, path in endpoints_to_test:
        if method == "POST" and "login" in path:
            # Test with dummy credentials to see response format
            test_data = {"email": "test@test.com", "password": "test123"}
            test_endpoint(method, path, test_data)
        else:
            test_endpoint(method, path)
    
    print(f"\n" + "=" * 60)
    print("💡 NEXT STEPS:")
    print("   1. Check which endpoints return 200/422 instead of 404")
    print("   2. Look for API documentation at /docs endpoint") 
    print("   3. Check if service is running correctly on Render")
    print("=" * 60)

if __name__ == "__main__":
    main()
