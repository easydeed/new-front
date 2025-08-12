#!/usr/bin/env python3
"""
Test PDF generation endpoints to see what's available
"""

import requests
import json

API_URL = "https://deedpro-main-api.onrender.com"

def test_pdf_endpoints():
    print("=" * 60)
    print("🔍 Testing PDF Generation Endpoints")
    print("=" * 60)
    print(f"🌐 API URL: {API_URL}")
    
    # Get a valid token first
    print(f"\n🔑 Getting authentication token...")
    try:
        auth_response = requests.post(f"{API_URL}/users/login", 
            json={"email": "test@deedpro-check.com", "password": "TestPassword123!"},
            headers={"Content-Type": "application/json"}
        )
        
        if auth_response.status_code == 200:
            token = auth_response.json().get('access_token')
            print(f"   ✅ Token obtained: {token[:50]}...")
        else:
            print(f"   ❌ Authentication failed")
            return
    except Exception as e:
        print(f"   💥 Auth error: {e}")
        return
    
    # Test various PDF generation endpoints
    pdf_endpoints = [
        ('/deeds', 'POST'),                    # Current frontend call
        ('/generate-deed', 'POST'),            # Common pattern
        ('/generate-deed-pdf', 'POST'),        # Specific PDF endpoint
        ('/deed/generate', 'POST'),            # Alternative pattern
        ('/users/deeds', 'POST'),              # User-specific
        ('/api/deeds', 'POST'),                # API prefix
        ('/generate-deed-preview', 'POST'),    # We know this works
    ]
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    # Sample deed data for testing
    test_deed_data = {
        "deed_type": "Grant Deed",
        "property_address": "123 Test St, Los Angeles, CA",
        "apn": "123-456-789",
        "county": "Los Angeles",
        "legal_description": "Test legal description",
        "owner_type": "Individual",
        "sales_price": 500000,
        "grantee_name": "John Doe",
        "vesting": "Individual",
        "grantor_name": "Jane Smith"
    }
    
    working_endpoints = []
    
    for endpoint, method in pdf_endpoints:
        url = f"{API_URL}{endpoint}"
        print(f"\n🔍 Testing: {method} {endpoint}")
        
        try:
            if method == 'POST':
                response = requests.post(url, 
                    json=test_deed_data,
                    headers=headers,
                    timeout=15
                )
            else:
                response = requests.get(url, headers=headers, timeout=15)
            
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 200:
                print(f"   ✅ SUCCESS - Endpoint works!")
                working_endpoints.append(endpoint)
                
                # Check response type
                content_type = response.headers.get('content-type', '')
                if 'application/pdf' in content_type:
                    print(f"   📄 Returns PDF directly")
                elif 'application/json' in content_type:
                    try:
                        data = response.json()
                        print(f"   📋 Returns JSON: {list(data.keys()) if isinstance(data, dict) else 'Array'}")
                    except:
                        pass
                        
            elif response.status_code in [401, 403]:
                print(f"   🔒 AUTH ERROR - Token might be invalid or insufficient permissions")
            elif response.status_code == 422:
                print(f"   ⚠️  VALIDATION ERROR - Endpoint exists but data format wrong")
                working_endpoints.append(f"{endpoint} (needs correct data)")
                try:
                    error_data = response.json()
                    print(f"   Details: {error_data.get('detail', 'Validation error')}")
                except:
                    pass
            elif response.status_code == 404:
                print(f"   ❌ NOT FOUND")
            elif response.status_code == 500:
                print(f"   💥 SERVER ERROR - Endpoint exists but has bugs")
                working_endpoints.append(f"{endpoint} (has server errors)")
            else:
                print(f"   ⚠️  Status: {response.status_code}")
                
        except Exception as e:
            print(f"   💥 ERROR: {str(e)}")
    
    return working_endpoints

def main():
    working_endpoints = test_pdf_endpoints()
    
    print(f"\n" + "=" * 60)
    print("📊 RESULTS - PDF ENDPOINTS")
    print("=" * 60)
    
    if working_endpoints:
        print(f"✅ WORKING/AVAILABLE ENDPOINTS:")
        for endpoint in working_endpoints:
            print(f"   - {endpoint}")
            
        print(f"\n💡 RECOMMENDATIONS:")
        if any('generate-deed-preview' in ep for ep in working_endpoints):
            print(f"   ✅ Preview generation works - PDF generation likely needs different endpoint")
        if any('/deeds' in ep for ep in working_endpoints):
            print(f"   ✅ /deeds endpoint available - check data format")
        else:
            print(f"   ⚠️  /deeds endpoint not found - frontend needs update")
            
    else:
        print(f"❌ NO WORKING PDF ENDPOINTS FOUND")
        print(f"🔍 Check backend main.py for actual PDF generation endpoints")
        
    print(f"\n🎯 NEXT STEPS:")
    print(f"   1. Check which endpoint should generate PDFs")
    print(f"   2. Verify the data format required")
    print(f"   3. Update frontend to use correct endpoint")

if __name__ == "__main__":
    main()
