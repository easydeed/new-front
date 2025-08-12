#!/usr/bin/env python3
"""
Test login with correct endpoint paths and find/create working credentials
"""

import requests
import json

API_URL = "https://deedpro-main-api.onrender.com"

def test_login_with_correct_endpoint(email, password):
    """Test login with the correct /users/login endpoint"""
    print(f"\n🔐 Testing login: {email}")
    
    try:
        response = requests.post(f"{API_URL}/users/login", 
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
            print(f"   Token: {data.get('access_token', 'N/A')[:50]}...")
            return True, data
        else:
            error_data = response.json() if response.headers.get('content-type') == 'application/json' else {}
            print(f"   ❌ FAILED - {error_data.get('detail', response.text)}")
            return False, error_data
            
    except Exception as e:
        print(f"   💥 ERROR - {str(e)}")
        return False, None

def create_test_account():
    """Create a new test account using the correct endpoint"""
    print(f"\n📝 Creating new test account...")
    
    # Get the required fields from our earlier discovery
    test_data = {
        "email": "testuser@deedpro.com",
        "password": "TestPassword123!",
        "confirm_password": "TestPassword123!",
        "full_name": "Test User",
        "role": "individual",  # or try "user", "client"
        "state": "CA",
        "agree_terms": True
    }
    
    try:
        response = requests.post(f"{API_URL}/users/register", 
            json=test_data,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        print(f"   Status: {response.status_code}")
        
        if response.status_code in [200, 201]:
            print(f"   ✅ REGISTRATION SUCCESS!")
            data = response.json()
            print(f"   User created: {data.get('user_id', 'N/A')}")
            return True, test_data["email"], test_data["password"]
        elif response.status_code == 422:
            error_data = response.json()
            print(f"   ⚠️  VALIDATION ERROR:")
            for error in error_data.get('detail', []):
                print(f"      - {error.get('msg', 'Unknown error')}: {error.get('loc', [])}")
            return False, None, None
        elif response.status_code == 409:
            print(f"   ℹ️  User already exists - can use for login testing")
            return True, test_data["email"], test_data["password"]
        else:
            error_data = response.json() if response.headers.get('content-type') == 'application/json' else {}
            print(f"   ❌ FAILED - {error_data.get('detail', response.text)}")
            return False, None, None
            
    except Exception as e:
        print(f"   💥 ERROR - {str(e)}")
        return False, None, None

def main():
    print("=" * 60)
    print("🔍 Testing Login with Correct Endpoints")
    print("=" * 60)
    print(f"🌐 API URL: {API_URL}")
    print(f"🔗 Login Endpoint: /users/login")
    print(f"🔗 Register Endpoint: /users/register")
    
    # Try existing test accounts first
    test_accounts = [
        ("test@deedpro-check.com", "TestPassword123!"),
        ("testuser@deedpro.com", "TestPassword123!"),
        ("demo@deedpro.com", "demo123"),
        ("test@example.com", "password123"),
    ]
    
    working_credentials = None
    
    print(f"\n🔑 Testing existing accounts...")
    for email, password in test_accounts:
        success, data = test_login_with_correct_endpoint(email, password)
        if success:
            working_credentials = (email, password)
            break
    
    # If no existing accounts work, try to create one
    if not working_credentials:
        print(f"\n📝 No existing accounts work, creating new test account...")
        success, email, password = create_test_account()
        
        if success:
            # Test login with the new account
            login_success, data = test_login_with_correct_endpoint(email, password)
            if login_success:
                working_credentials = (email, password)
    
    print(f"\n" + "=" * 60)
    print("📊 FINAL RESULTS")
    print("=" * 60)
    
    if working_credentials:
        email, password = working_credentials
        print(f"✅ WORKING CREDENTIALS FOUND:")
        print(f"   📧 Email: {email}")
        print(f"   🔑 Password: {password}")
        print(f"\n🌐 LOGIN URL: https://new-front-kappa.vercel.app/login")
        print(f"🎯 Ready to test!")
    else:
        print(f"❌ NO WORKING CREDENTIALS FOUND")
        print(f"💡 Manual account creation may be needed")
        print(f"🔍 Check API docs: {API_URL}/docs")

if __name__ == "__main__":
    main()
