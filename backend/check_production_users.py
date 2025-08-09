#!/usr/bin/env python3
"""
Check Production Database Users - DeedPro
This script connects to your production Render database
"""

import requests
import json

def check_production_users():
    """Check users via production API endpoint"""
    
    base_url = "https://deedpro-main-api.onrender.com"
    
    print("🔗 Testing connection to production API...")
    
    try:
        # Test health endpoint first
        response = requests.get(f"{base_url}/health", timeout=10)
        if response.ok:
            print("✅ Production API is responsive")
            print(f"Health check: {response.json()}")
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Failed to connect to production API: {e}")
        return False
    
    # Test user registration to see if database is working
    print("\n🧪 Testing user registration endpoint...")
    test_user_data = {
        "email": "test@deedpro-check.com",
        "password": "TestPassword123!",
        "confirm_password": "TestPassword123!",
        "full_name": "Test User",
        "role": "user", 
        "state": "CA",
        "agree_terms": True,
        "subscribe": False
    }
    
    try:
        response = requests.post(
            f"{base_url}/users/register",
            json=test_user_data,
            timeout=10
        )
        
        if response.status_code in [200, 201]:
            print("✅ User registration works - database is functional")
            result = response.json()
            print(f"Created user: {result.get('email', 'N/A')}")
            return True
        elif response.status_code == 409 or response.status_code == 400:
            error_detail = response.json()
            if "already exists" in error_detail.get('detail', ''):
                print("✅ User already exists - database is functional")
                return True
            else:
                print(f"❌ Registration failed: {response.status_code}")
                print(f"Error: {error_detail}")
                return False
        else:
            print(f"❌ Registration failed: {response.status_code}")
            try:
                error_detail = response.json()
                print(f"Error: {error_detail}")
            except:
                print(f"Error text: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Registration test failed: {e}")
        return False

def test_login():
    """Test login with common test credentials"""
    
    base_url = "https://deedpro-main-api.onrender.com"
    
    # Common test credentials to try  
    test_credentials = [
        {"email": "test@deedpro-check.com", "password": "TestPassword123!"},
        {"email": "admin@deedpro.com", "password": "admin123"},
        {"email": "test@example.com", "password": "TestPassword123!"},
        {"email": "demo@deedpro.com", "password": "TestPassword123!"}
    ]
    
    print("\n🔐 Testing login with potential test accounts...")
    
    for creds in test_credentials:
        try:
            response = requests.post(
                f"{base_url}/users/login",
                json=creds,
                timeout=10
            )
            
            if response.ok:
                result = response.json()
                print(f"✅ Login successful: {creds['email']}")
                print(f"   User data: {result.get('user', {})}")
                return creds['email'], result.get('access_token')
            else:
                print(f"❌ Login failed for {creds['email']}: {response.status_code}")
                
        except Exception as e:
            print(f"❌ Login error for {creds['email']}: {e}")
    
    return None, None

if __name__ == "__main__":
    print("🚀 Checking DeedPro Production Database...")
    print("=" * 50)
    
    # Check if API is working
    if check_production_users():
        # Try to login with test accounts
        email, token = test_login()
        
        if token:
            print(f"\n🎉 Successfully authenticated as: {email}")
            print(f"Token (first 20 chars): {token[:20]}...")
        else:
            print("\n⚠️  No test accounts found or login failed")
            print("💡 You may need to create a test account manually")
    
    print("\n" + "=" * 50)
    print("Production database check complete!")
