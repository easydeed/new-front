#!/usr/bin/env python3
"""
Test Deed Preview Generation - DeedPro
"""

import requests
import json

def test_deed_preview():
    """Test deed preview generation with sample data"""
    
    base_url = "https://deedpro-main-api.onrender.com"
    
    # Login to get token
    print("🔐 Logging in...")
    login_response = requests.post(f"{base_url}/users/login", json={
        "email": "test@deedpro-check.com",
        "password": "TestPassword123!"
    })
    
    if not login_response.ok:
        print(f"❌ Login failed: {login_response.status_code}")
        return False
        
    token = login_response.json().get("access_token")
    print("✅ Login successful")
    
    # Test deed preview with proper data structure
    print("\n📄 Testing deed preview generation...")
    
    deed_data = {
        "deed_type": "grant_deed",
        "data": {
            # Core deed information - using template variable names
            "recording_requested_by": "John Smith, Escrow Officer",
            "mail_to": "123 Main St, Los Angeles, CA 90210",
            "order_no": "ORD-2024-001",
            "escrow_no": "ESC-2024-001",
            "apn": "1234-567-890",
            "documentary_tax": "550.00",
            "city": "Los Angeles",
            "grantor": "Jane Doe, a single woman",
            "grantee": "John Smith and Mary Smith, husband and wife as joint tenants",
            "county": "Los Angeles",
            "property_description": "LOT 1 OF TRACT NO. 12345, IN THE CITY OF LOS ANGELES, COUNTY OF LOS ANGELES, STATE OF CALIFORNIA, AS PER MAP RECORDED IN BOOK 123, PAGE 45 OF MAPS, IN THE OFFICE OF THE COUNTY RECORDER OF SAID COUNTY.",
            "date": "01/15/2024",
            "grantor_signature": "Jane Doe",
            
            # Notary section
            "county_notary": "Los Angeles",
            "notary_date": "01/15/2024",
            "notary_name": "Robert Notary",
            "appeared_before_notary": "Jane Doe",
            "notary_signature": "Robert Notary",
            
            # Checkbox fields
            "tax_computed_full_value": True,
            "tax_computed_less_liens": False,
            "is_unincorporated": False
        }
    }
    
    try:
        response = requests.post(
            f"{base_url}/generate-deed-preview",
            json=deed_data,
            headers={"Authorization": f"Bearer {token}"},
            timeout=30
        )
        
        if response.ok:
            result = response.json()
            print("✅ Preview generation successful!")
            print(f"Status: {result.get('status')}")
            print(f"Deed type: {result.get('deed_type')}")
            print(f"AI suggestions available: {bool(result.get('ai_suggestions'))}")
            print(f"HTML preview length: {len(result.get('html', ''))}")
            
            # Save HTML for inspection
            with open('deed_preview_test.html', 'w', encoding='utf-8') as f:
                f.write(result.get('html', ''))
            print("💾 Saved preview to deed_preview_test.html")
            
            return True
        else:
            print(f"❌ Preview failed: {response.status_code}")
            try:
                error_detail = response.json()
                print(f"Error: {error_detail}")
            except:
                print(f"Error text: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Request error: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Testing DeedPro Deed Preview Generation...")
    print("=" * 50)
    
    success = test_deed_preview()
    
    print("\n" + "=" * 50)
    if success:
        print("🎉 Deed preview test successful!")
    else:
        print("💥 Deed preview test failed!")
