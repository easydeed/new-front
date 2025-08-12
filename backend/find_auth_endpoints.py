#!/usr/bin/env python3
"""
Find the correct authentication endpoints by testing common patterns
"""

import requests

API_URL = "https://deedpro-main-api.onrender.com"

def test_auth_endpoints():
    print("=" * 60)
    print("🔍 Finding Correct Authentication Endpoints")
    print("=" * 60)
    print(f"🌐 API URL: {API_URL}")
    
    # Common authentication endpoint patterns
    endpoints_to_test = [
        # Login endpoints
        ('/login', 'LOGIN'),
        ('/users/login', 'LOGIN'),
        ('/auth/login', 'LOGIN'), 
        ('/api/login', 'LOGIN'),
        ('/v1/login', 'LOGIN'),
        ('/signin', 'LOGIN'),
        ('/users/signin', 'LOGIN'),
        
        # Register endpoints  
        ('/register', 'REGISTER'),
        ('/users/register', 'REGISTER'),
        ('/auth/register', 'REGISTER'),
        ('/api/register', 'REGISTER'),
        ('/v1/register', 'REGISTER'),
        ('/signup', 'REGISTER'),
        ('/users/signup', 'REGISTER'),
    ]
    
    working_endpoints = {"login": [], "register": []}
    
    for endpoint, endpoint_type in endpoints_to_test:
        url = f"{API_URL}{endpoint}"
        print(f"\n🔍 Testing: POST {endpoint} ({endpoint_type})")
        
        try:
            # Test with dummy credentials
            test_data = {
                "email": "test@test.com", 
                "password": "test123"
            }
            
            # Add extra fields for register endpoints
            if endpoint_type == 'REGISTER':
                test_data.update({
                    "confirm_password": "test123",
                    "agree_terms": True
                })
            
            response = requests.post(url, 
                json=test_data,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 200:
                print(f"   ✅ SUCCESS - {endpoint_type} worked!")
                if endpoint_type == 'LOGIN':
                    working_endpoints["login"].append(endpoint)
                else:
                    working_endpoints["register"].append(endpoint)
                    
            elif response.status_code in [401, 422]:
                print(f"   ✅ ENDPOINT EXISTS - Got validation/auth error (expected)")
                if endpoint_type == 'LOGIN':
                    working_endpoints["login"].append(endpoint)
                else:
                    working_endpoints["register"].append(endpoint)
                    
                # Show the error details
                try:
                    error_data = response.json()
                    print(f"   Details: {error_data.get('detail', 'Validation error')}")
                except:
                    pass
                    
            elif response.status_code == 404:
                print(f"   ❌ NOT FOUND")
            elif response.status_code == 405:
                print(f"   ⚠️  METHOD NOT ALLOWED - Endpoint exists but wrong method")
            else:
                print(f"   ⚠️  Status: {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Response: {error_data}")
                except:
                    print(f"   Response: {response.text[:100]}...")
                        
        except Exception as e:
            print(f"   💥 ERROR: {str(e)}")
    
    return working_endpoints

def test_other_endpoints():
    print(f"\n" + "=" * 60)
    print("🔍 Testing Other Important Endpoints")
    print("=" * 60)
    
    other_endpoints = [
        ('/users/profile', 'GET'),
        ('/pricing', 'GET'),
        ('/generate-deed-preview', 'POST'),
        ('/check-widget-access', 'GET'),
    ]
    
    for endpoint, method in other_endpoints:
        url = f"{API_URL}{endpoint}"
        print(f"\n🔍 Testing: {method} {endpoint}")
        
        try:
            if method == 'GET':
                response = requests.get(url, timeout=10)
            else:
                response = requests.post(url, 
                    json={"test": "data"},
                    headers={"Content-Type": "application/json"},
                    timeout=10
                )
            
            print(f"   Status: {response.status_code}")
            
            if response.status_code in [200, 401, 422]:
                print(f"   ✅ ENDPOINT EXISTS")
            elif response.status_code == 404:
                print(f"   ❌ NOT FOUND")
            else:
                print(f"   ⚠️  Status: {response.status_code}")
                
        except Exception as e:
            print(f"   💥 ERROR: {str(e)}")

def main():
    # Test authentication endpoints
    working_endpoints = test_auth_endpoints()
    
    # Test other endpoints
    test_other_endpoints()
    
    print(f"\n" + "=" * 60)
    print("📊 SUMMARY - WORKING ENDPOINTS")
    print("=" * 60)
    
    if working_endpoints["login"] or working_endpoints["register"]:
        print(f"✅ AUTHENTICATION ENDPOINTS FOUND:")
        
        if working_endpoints["login"]:
            print(f"\n🔑 LOGIN ENDPOINTS:")
            for endpoint in working_endpoints["login"]:
                print(f"   - {API_URL}{endpoint}")
                
        if working_endpoints["register"]:
            print(f"\n📝 REGISTER ENDPOINTS:")
            for endpoint in working_endpoints["register"]:
                print(f"   - {API_URL}{endpoint}")
                
        print(f"\n💻 FRONTEND UPDATES NEEDED:")
        if working_endpoints["login"]:
            print(f"   Update login calls to use: {working_endpoints['login'][0]}")
        if working_endpoints["register"]:
            print(f"   Update register calls to use: {working_endpoints['register'][0]}")
            
    else:
        print(f"❌ NO WORKING AUTH ENDPOINTS FOUND")
        print(f"🔍 Manual check needed at: {API_URL}/docs")
        
    print(f"\n🌐 API Documentation: {API_URL}/docs")

if __name__ == "__main__":
    main()
