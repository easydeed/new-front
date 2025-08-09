#!/usr/bin/env python3
"""
Fix User Data and Database Issues - DeedPro
"""

import requests
import json

def fix_test_user_role():
    """Fix the test user's missing role"""
    
    base_url = "https://deedpro-main-api.onrender.com"
    
    print("🔧 Fixing test user role...")
    
    # Login as the test user first to confirm it exists
    login_response = requests.post(f"{base_url}/users/login", json={
        "email": "test@deedpro-check.com", 
        "password": "TestPassword123!"
    })
    
    if not login_response.ok:
        print("❌ Cannot login to test user")
        return False
    
    user_data = login_response.json().get('user', {})
    user_id = user_data.get('id')
    
    print(f"✅ Found test user ID: {user_id}")
    print(f"   Current role: {user_data.get('role', 'None')}")
    print(f"   Current plan: {user_data.get('plan', 'None')}")
    
    # Try to update user via API if there's an endpoint
    token = login_response.json().get('access_token')
    
    # Check if we can update the profile
    try:
        update_data = {
            "role": "user",
            "plan": "free"
        }
        
        # Try profile update endpoint
        response = requests.put(
            f"{base_url}/users/profile",
            json=update_data,
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        
        if response.ok:
            print("✅ User profile updated successfully")
            return True
        else:
            print(f"❌ Profile update failed: {response.status_code}")
            print(f"   Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Update error: {e}")
    
    return False

def check_database_tables():
    """Check what tables exist in the database"""
    
    print("\n📋 Checking database structure...")
    
    # Use a database query endpoint if available
    base_url = "https://deedpro-main-api.onrender.com"
    
    # Login to get token
    login_response = requests.post(f"{base_url}/users/login", json={
        "email": "test@deedpro-check.com",
        "password": "TestPassword123!"
    })
    
    if not login_response.ok:
        print("❌ Cannot access database info")
        return
    
    token = login_response.json().get("access_token")
    
    # Try to access admin endpoints to see what's available
    admin_endpoints = [
        "/admin/users",
        "/admin/stats", 
        "/admin/database-info",
        "/admin/system-status"
    ]
    
    for endpoint in admin_endpoints:
        try:
            response = requests.get(
                f"{base_url}{endpoint}",
                headers={"Authorization": f"Bearer {token}"},
                timeout=5
            )
            print(f"   {endpoint}: {response.status_code}")
            if response.ok and response.headers.get('content-type', '').startswith('application/json'):
                data = response.json()
                if isinstance(data, dict) and len(data) < 10:
                    print(f"      Data: {data}")
        except Exception as e:
            print(f"   {endpoint}: ERROR ({e})")

def test_manual_user_creation():
    """Test creating a proper admin user"""
    
    print("\n👤 Testing user creation...")
    
    base_url = "https://deedpro-main-api.onrender.com"
    
    # Try to register a new admin user
    admin_user_data = {
        "email": "admin@deedpro.com",
        "password": "AdminPassword123!",
        "confirm_password": "AdminPassword123!",
        "full_name": "Admin User",
        "role": "admin",
        "state": "CA",
        "agree_terms": True,
        "subscribe": False
    }
    
    try:
        response = requests.post(
            f"{base_url}/users/register",
            json=admin_user_data,
            timeout=10
        )
        
        if response.ok:
            result = response.json()
            print(f"✅ Admin user created: {result.get('email')}")
            
            # Try to login with new admin
            login_response = requests.post(f"{base_url}/users/login", json={
                "email": "admin@deedpro.com",
                "password": "AdminPassword123!"
            })
            
            if login_response.ok:
                admin_data = login_response.json().get('user', {})
                print(f"   Admin login successful!")
                print(f"   Role: {admin_data.get('role')}")
                print(f"   Plan: {admin_data.get('plan')}")
            
        elif response.status_code == 400:
            error_detail = response.json()
            if "already exists" in error_detail.get('detail', ''):
                print(f"✅ Admin user already exists")
            else:
                print(f"❌ Admin creation failed: {error_detail}")
        else:
            print(f"❌ Admin creation failed: {response.status_code}")
            print(f"   Error: {response.text}")
            
    except Exception as e:
        print(f"❌ Admin creation error: {e}")

def create_plan_limits_test():
    """Test if we can create plan limits via API"""
    
    print("\n💰 Testing plan limits...")
    
    base_url = "https://deedpro-main-api.onrender.com"
    
    # Login with admin if possible
    login_attempts = [
        {"email": "admin@deedpro.com", "password": "AdminPassword123!"},
        {"email": "test@deedpro-check.com", "password": "TestPassword123!"}
    ]
    
    token = None
    for creds in login_attempts:
        try:
            response = requests.post(f"{base_url}/users/login", json=creds)
            if response.ok:
                token = response.json().get('access_token')
                print(f"✅ Logged in as: {creds['email']}")
                break
        except:
            continue
    
    if not token:
        print("❌ No admin access available")
        return
    
    # Try to access pricing endpoints
    pricing_endpoints = [
        "/pricing/plans",
        "/admin/pricing",
        "/plan-limits"
    ]
    
    for endpoint in pricing_endpoints:
        try:
            response = requests.get(
                f"{base_url}{endpoint}",
                headers={"Authorization": f"Bearer {token}"},
                timeout=5
            )
            print(f"   {endpoint}: {response.status_code}")
            if response.ok:
                try:
                    data = response.json()
                    print(f"      Found {len(data)} items")
                except:
                    print(f"      Response: {response.text[:100]}...")
        except Exception as e:
            print(f"   {endpoint}: ERROR ({e})")

if __name__ == "__main__":
    print("🚀 DeedPro User Data & Database Fix")
    print("=" * 50)
    
    fix_test_user_role()
    check_database_tables()
    test_manual_user_creation()
    create_plan_limits_test()
    
    print("\n" + "=" * 50)
    print("User data fix complete!")
