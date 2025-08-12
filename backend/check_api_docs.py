#!/usr/bin/env python3
"""
Check the API documentation to find correct endpoint paths
"""

import requests
from bs4 import BeautifulSoup
import json

API_URL = "https://deedpro-main-api.onrender.com"

def check_api_docs():
    print("=" * 60)
    print("📋 Checking API Documentation")
    print("=" * 60)
    
    try:
        # Get the API docs page
        response = requests.get(f"{API_URL}/docs")
        print(f"📖 API Docs Status: {response.status_code}")
        
        if response.status_code == 200:
            # Parse HTML to find endpoint information
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Look for common patterns that indicate endpoints
            text = response.text.lower()
            
            # Search for common endpoint patterns
            endpoints = []
            if 'users/login' in text:
                endpoints.append('/users/login')
            if '/auth/login' in text:
                endpoints.append('/auth/login')
            if 'api/login' in text:
                endpoints.append('/api/login')
            if 'users/register' in text:
                endpoints.append('/users/register')
            if '/auth/register' in text:
                endpoints.append('/auth/register')
            if 'api/register' in text:
                endpoints.append('/api/register')
            
            print(f"🔍 Found potential endpoints in docs:")
            for endpoint in endpoints:
                print(f"   - {endpoint}")
            
            # Also check for specific API patterns
            if 'openapi' in text:
                print("✅ OpenAPI/Swagger documentation detected")
            
            return endpoints
            
    except Exception as e:
        print(f"❌ Error checking docs: {e}")
        return []

def test_potential_endpoints():
    print("\n" + "=" * 60)
    print("🧪 Testing Potential Auth Endpoints")
    print("=" * 60)
    
    # Common authentication endpoint patterns
    auth_endpoints = [
        '/users/login',
        '/auth/login', 
        '/api/login',
        '/v1/login',
        '/users/register',
        '/auth/register',
        '/api/register',
        '/v1/register',
        '/users/signin',
        '/signin',
        '/signup'
    ]
    
    working_endpoints = []
    
    for endpoint in auth_endpoints:
        url = f"{API_URL}{endpoint}"
        print(f"\n🔍 Testing: POST {endpoint}")
        
        try:
            # Test with dummy credentials
            response = requests.post(url, 
                json={"email": "test@test.com", "password": "test123"},
                headers={"Content-Type": "application/json"},
                timeout=5
            )
            
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 200:
                print(f"   ✅ SUCCESS - Login worked!")
                working_endpoints.append(endpoint)
            elif response.status_code in [401, 422]:
                print(f"   ✅ ENDPOINT EXISTS - Got validation/auth error (expected)")
                working_endpoints.append(endpoint)
            elif response.status_code == 404:
                print(f"   ❌ NOT FOUND")
            else:
                print(f"   ⚠️  Status: {response.status_code}")
                if response.headers.get('content-type', '').startswith('application/json'):
                    try:
                        data = response.json()
                        print(f"   Response: {data.get('detail', str(data))}")
                    except:
                        pass
                        
        except Exception as e:
            print(f"   💥 ERROR: {str(e)}")
    
    return working_endpoints

def main():
    print(f"🌐 Testing API: {API_URL}")
    
    # Check docs first
    doc_endpoints = check_api_docs()
    
    # Test potential endpoints
    working_endpoints = test_potential_endpoints()
    
    print(f"\n" + "=" * 60)
    print("📊 RESULTS")
    print("=" * 60)
    
    if working_endpoints:
        print(f"✅ WORKING AUTH ENDPOINTS FOUND:")
        for endpoint in working_endpoints:
            print(f"   🔗 {API_URL}{endpoint}")
            
        print(f"\n💡 UPDATE FRONTEND TO USE:")
        for endpoint in working_endpoints:
            if 'login' in endpoint:
                print(f"   Login: {endpoint}")
            elif 'register' in endpoint or 'signup' in endpoint:
                print(f"   Register: {endpoint}")
    else:
        print(f"❌ NO WORKING ENDPOINTS FOUND")
        print(f"🔍 Check API documentation manually at: {API_URL}/docs")

if __name__ == "__main__":
    main()
