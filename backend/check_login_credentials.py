#!/usr/bin/env python3
"""
Check which test accounts exist in production and test login functionality
"""

import requests
import json

API_URL = "https://deedpro-api.onrender.com"

def test_login(email, password):
    """Test login with given credentials"""
    print(f"\n🔐 Testing login for: {email}")
    
    try:
        response = requests.post(f"{API_URL}/login", 
            json={"email": email, "password": password},
            headers={"Content-Type": "application/json"}
        )
        
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ SUCCESS - Token received")
            print(f"   User ID: {data.get('user_id', 'N/A')}")
            print(f"   Email: {data.get('email', 'N/A')}")
            print(f"   Role: {data.get('role', 'N/A')}")
            return True
        else:
            error_data = response.json() if response.headers.get('content-type') == 'application/json' else {}
            print(f"   ❌ FAILED - {error_data.get('detail', response.text)}")
            return False
            
    except Exception as e:
        print(f"   💥 ERROR - {str(e)}")
        return False

def test_registration(email, password):
    """Test if we can register a new account"""
    print(f"\n📝 Testing registration for: {email}")
    
    try:
        response = requests.post(f"{API_URL}/register", 
            json={
                "email": email, 
                "password": password,
                "confirm_password": password,
                "agree_terms": True
            },
            headers={"Content-Type": "application/json"}
        )
        
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 201:
            print(f"   ✅ REGISTRATION SUCCESS")
            return True
        elif response.status_code in [400, 409]:
            error_data = response.json() if response.headers.get('content-type') == 'application/json' else {}
            detail = error_data.get('detail', response.text)
            if 'already exists' in detail.lower() or 'already registered' in detail.lower():
                print(f"   ℹ️  Account already exists - this is good!")
                return True
            else:
                print(f"   ❌ REGISTRATION FAILED - {detail}")
                return False
        else:
            error_data = response.json() if response.headers.get('content-type') == 'application/json' else {}
            print(f"   ❌ REGISTRATION FAILED - {error_data.get('detail', response.text)}")
            return False
            
    except Exception as e:
        print(f"   💥 ERROR - {str(e)}")
        return False

def main():
    print("=" * 60)
    print("🔍 DeedPro Production Login Credentials Test")
    print("=" * 60)
    
    # Test accounts to check
    test_accounts = [
        ("test@example.com", "password123"),
        ("admin@deedpro.com", "admin123"),
        ("demo@deedpro.com", "demo123"),
        ("user@test.com", "test123"),
    ]
    
    print(f"\n🌐 Testing against: {API_URL}")
    
    # Test login for each account
    working_accounts = []
    for email, password in test_accounts:
        if test_login(email, password):
            working_accounts.append((email, password))
    
    print(f"\n" + "=" * 60)
    print("📊 RESULTS SUMMARY")
    print("=" * 60)
    
    if working_accounts:
        print(f"\n✅ WORKING CREDENTIALS ({len(working_accounts)} found):")
        for email, password in working_accounts:
            print(f"   📧 Email: {email}")
            print(f"   🔑 Password: {password}")
            print()
    else:
        print(f"\n❌ NO WORKING CREDENTIALS FOUND")
        print(f"\n💡 Let's try creating a test account...")
        
        # Try to register a simple test account
        test_registration("testuser@deedpro.com", "testpass123")
    
    print(f"\n🔗 LOGIN URL: https://new-front-kappa.vercel.app/login")
    print(f"🔗 API URL: {API_URL}")

if __name__ == "__main__":
    main()
