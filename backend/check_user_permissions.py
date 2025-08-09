#!/usr/bin/env python3
"""
Check User Permissions and Roles - DeedPro
"""

import requests
import json

def check_user_permissions():
    """Check permissions for users in the system"""
    
    base_url = "https://deedpro-main-api.onrender.com"
    
    # Test accounts to check
    test_accounts = [
        {"email": "test@deedpro-check.com", "password": "TestPassword123!"},
        {"email": "admin@deedpro.com", "password": "admin123"},
        {"email": "test@example.com", "password": "TestPassword123!"},
        {"email": "demo@deedpro.com", "password": "TestPassword123!"}
    ]
    
    print("🔐 Checking user permissions and roles...")
    print("=" * 60)
    
    for account in test_accounts:
        print(f"\n👤 Testing: {account['email']}")
        print("-" * 40)
        
        # Try to login
        try:
            response = requests.post(
                f"{base_url}/users/login",
                json=account,
                timeout=10
            )
            
            if response.ok:
                result = response.json()
                user_data = result.get('user', {})
                token = result.get('access_token')
                
                print(f"✅ Login successful")
                print(f"   ID: {user_data.get('id')}")
                print(f"   Email: {user_data.get('email')}")
                print(f"   Name: {user_data.get('full_name')}")
                print(f"   Role: {user_data.get('role', 'Not specified')}")
                print(f"   Plan: {user_data.get('plan', 'Not specified')}")
                
                # Test access to protected endpoints
                if token:
                    test_protected_endpoints(token, user_data, base_url)
                
            else:
                print(f"❌ Login failed: {response.status_code}")
                
        except Exception as e:
            print(f"❌ Login error: {e}")

def test_protected_endpoints(token, user_data, base_url):
    """Test access to various protected endpoints"""
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test dashboard access (should work for all authenticated users)
    print("\n   🔒 Testing protected endpoints:")
    
    # Test user profile access
    try:
        response = requests.get(f"{base_url}/users/profile", headers=headers, timeout=5)
        if response.ok:
            profile = response.json()
            print(f"   ✅ Profile access: SUCCESS")
            print(f"      Plan: {profile.get('plan', 'N/A')}")
            print(f"      Verified: {profile.get('verified', False)}")
            print(f"      Active: {profile.get('is_active', False)}")
        else:
            print(f"   ❌ Profile access: FAILED ({response.status_code})")
    except Exception as e:
        print(f"   ❌ Profile access: ERROR ({e})")
    
    # Test deed creation access
    try:
        test_deed_data = {
            "deed_type": "grant_deed",
            "data": {"grantor": "Test", "grantee": "Test", "county": "Test"}
        }
        response = requests.post(
            f"{base_url}/generate-deed-preview", 
            json=test_deed_data, 
            headers=headers, 
            timeout=5
        )
        if response.ok:
            print(f"   ✅ Deed preview: SUCCESS")
        else:
            print(f"   ❌ Deed preview: FAILED ({response.status_code})")
    except Exception as e:
        print(f"   ❌ Deed preview: ERROR ({e})")
    
    # Test admin endpoints (if user has admin role)
    if user_data.get('role') == 'admin':
        try:
            response = requests.get(f"{base_url}/admin/users", headers=headers, timeout=5)
            if response.ok:
                print(f"   ✅ Admin access: SUCCESS")
            else:
                print(f"   ❌ Admin access: FAILED ({response.status_code})")
        except Exception as e:
            print(f"   ❌ Admin access: ERROR ({e})")
    
    # Test pricing info access
    try:
        response = requests.get(f"{base_url}/pricing/plans", headers=headers, timeout=5)
        if response.ok:
            plans = response.json()
            print(f"   ✅ Pricing access: SUCCESS ({len(plans)} plans available)")
        else:
            print(f"   ❌ Pricing access: FAILED ({response.status_code})")
    except Exception as e:
        print(f"   ❌ Pricing access: ERROR ({e})")

def check_specific_user_details():
    """Get detailed info about the known test user"""
    
    base_url = "https://deedpro-main-api.onrender.com"
    
    # Login with known test user
    login_response = requests.post(f"{base_url}/users/login", json={
        "email": "test@deedpro-check.com",
        "password": "TestPassword123!"
    })
    
    if login_response.ok:
        result = login_response.json()
        token = result.get("access_token")
        
        print("\n🔍 Detailed User Information:")
        print("=" * 40)
        
        # Get full profile
        profile_response = requests.get(
            f"{base_url}/users/profile",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if profile_response.ok:
            profile = profile_response.json()
            print("📋 Full Profile Data:")
            for key, value in profile.items():
                print(f"   {key}: {value}")

if __name__ == "__main__":
    print("🚀 DeedPro User Permissions Check")
    print("=" * 60)
    
    check_user_permissions()
    check_specific_user_details()
    
    print("\n" + "=" * 60)
    print("User permissions check complete!")
