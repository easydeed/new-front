#!/usr/bin/env python3
"""
Test the correct API URL from documentation
"""

import requests
import json

# Correct API URL from documentation
API_URL = "https://deedpro-main-api.onrender.com"

def test_endpoints():
    print("=" * 60)
    print("🔍 Testing CORRECT API URL")
    print("=" * 60)
    print(f"🌐 API URL: {API_URL}")
    
    # Test basic endpoints
    endpoints = [
        ("GET", "/"),
        ("GET", "/docs"),
        ("GET", "/health"),
        ("POST", "/login"),
        ("POST", "/register"),
    ]
    
    for method, path in endpoints:
        url = f"{API_URL}{path}"
        print(f"\n🔍 Testing: {method} {url}")
        
        try:
            if method == "GET":
                response = requests.get(url, timeout=10)
            elif method == "POST":
                # Test with dummy data
                data = {"email": "test@test.com", "password": "test123"}
                response = requests.post(url, json=data, timeout=10)
            
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 200:
                print(f"   ✅ SUCCESS")
            elif response.status_code == 422:
                print(f"   ✅ ENDPOINT EXISTS (validation error expected)")
            elif response.status_code == 404:
                print(f"   ❌ NOT FOUND")
            else:
                print(f"   ⚠️  RESPONSE: {response.status_code}")
                
            # Show response preview
            if response.headers.get('content-type', '').startswith('application/json'):
                try:
                    data = response.json()
                    print(f"   Data: {json.dumps(data, indent=2)[:200]}...")
                except:
                    pass
            else:
                print(f"   Text: {response.text[:100]}...")
                
        except Exception as e:
            print(f"   💥 ERROR: {str(e)}")

def test_working_credentials():
    print(f"\n" + "=" * 60)
    print("🔑 Testing Login with Different Credentials")
    print("=" * 60)
    
    # Try different credential combinations
    test_accounts = [
        ("test@deedpro-check.com", "TestPassword123!"),  # From docs
        ("test@example.com", "password123"),
        ("admin@deedpro.com", "admin123"),
        ("demo@deedpro.com", "demo123"),
    ]
    
    for email, password in test_accounts:
        print(f"\n🔐 Testing: {email}")
        
        try:
            response = requests.post(f"{API_URL}/login", 
                json={"email": email, "password": password},
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"   ✅ LOGIN SUCCESS!")
                print(f"   User ID: {data.get('user_id', 'N/A')}")
                print(f"   Email: {data.get('email', 'N/A')}")
                return email, password
            elif response.status_code == 401:
                print(f"   ❌ Invalid credentials")
            elif response.status_code == 422:
                error = response.json()
                print(f"   ⚠️  Validation error: {error.get('detail', 'Unknown')}")
            else:
                print(f"   ⚠️  Response: {response.status_code}")
                
        except Exception as e:
            print(f"   💥 ERROR: {str(e)}")
    
    return None, None

if __name__ == "__main__":
    test_endpoints()
    working_email, working_password = test_working_credentials()
    
    print(f"\n" + "=" * 60)
    print("📊 SUMMARY")
    print("=" * 60)
    
    if working_email:
        print(f"✅ WORKING CREDENTIALS FOUND:")
        print(f"   📧 Email: {working_email}")
        print(f"   🔑 Password: {working_password}")
        print(f"   🌐 Login URL: https://new-front-kappa.vercel.app/login")
    else:
        print(f"❌ No working credentials found")
        print(f"💡 Try registering a new account first")
