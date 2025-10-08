"""
Phase 5-Prequal B: Direct Backend Test
"""
import requests
from datetime import datetime

# Configuration
BACKEND_URL = "https://deedpro-main-api.onrender.com"

# JWT token
JWT_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2IiwiZW1haWwiOiJ0ZXN0QGRlZWRwcm8tY2hlY2suY29tIiwiZXhwIjoxNzU5ODk2OTIxfQ.xmDp2OX5zLbA6lBO883nUZ6MKAZW1RDjzjlHdM4M_YA"

# Test payload
test_payload = {
    "requested_by": "Gerard - Phase 5-Prequal B Test",
    "title_company": "DeedPro Test Title",
    "escrow_no": "TEST-2025-001",
    "title_order_no": "ORDER-2025-001",
    "return_to": {
        "name": "Test Recipient",
        "company": "Test Escrow Company",
        "address1": "123 Test Street",
        "address2": "",
        "city": "Los Angeles",
        "state": "CA",
        "zip": "90012"
    },
    "apn": "1234-567-890",
    "dtt": {
        "amount": "1250.00",
        "basis": "full_value",
        "area_type": "city",
        "city_name": "Los Angeles"
    },
    "grantors_text": "JOHN DOE; JANE DOE",
    "grantees_text": "ALICE SMITH, A SINGLE PERSON",
    "county": "Los Angeles",
    "legal_description": "LOT 5, BLOCK 2, TRACT NO. 12345, AS PER MAP RECORDED IN BOOK 123 PAGE 45 OF MAPS, IN THE OFFICE OF THE COUNTY RECORDER OF SAID COUNTY.",
    "execution_date": datetime.now().strftime("%Y-%m-%d"),
    "recorder_profile": {"id": "los_angeles"}
}

print("\n" + "="*80)
print("TESTING PHASE 5-PREQUAL B PIXEL-PERFECT ENDPOINT")
print("="*80)

# Test the pixel endpoint
url = f"{BACKEND_URL}/api/generate/grant-deed-ca-pixel?engine=weasyprint"
headers = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {JWT_TOKEN}"
}

print(f"\nSending request to: {url}")
print(f"Payload summary:")
print(f"   Grantors: {test_payload['grantors_text']}")
print(f"   Grantees: {test_payload['grantees_text']}")
print(f"   County: {test_payload['county']}")
print(f"   APN: {test_payload['apn']}")

try:
    start_time = datetime.now()
    response = requests.post(url, json=test_payload, headers=headers)
    end_time = datetime.now()
    duration = (end_time - start_time).total_seconds()
    
    print(f"\nResponse time: {duration:.2f}s")
    print(f"Status code: {response.status_code}")
    
    # Check headers
    print(f"\nResponse Headers:")
    interesting_headers = [
        'X-Generation-Time', 'X-Request-ID', 
        'X-PDF-Engine', 'X-Phase', 'Content-Type'
    ]
    for header in interesting_headers:
        value = response.headers.get(header, 'N/A')
        print(f"   {header}: {value}")
    
    if response.status_code == 200:
        # Save PDF
        filename = f"pixel_perfect_deed_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        with open(filename, 'wb') as f:
            f.write(response.content)
        
        file_size = len(response.content)
        print(f"\nSUCCESS! PDF GENERATED!")
        print(f"   File: {filename}")
        print(f"   Size: {file_size:,} bytes ({file_size/1024:.1f} KB)")
        print(f"\nPHASE 5-PREQUAL B PIXEL-PERFECT ENDPOINT WORKS!")
        print(f"   Open the PDF to verify pixel-perfect positioning!")
        
    elif response.status_code == 400:
        print(f"\nValidation Error:")
        print(f"   {response.text}")
        
    elif response.status_code == 401 or response.status_code == 403:
        print(f"\nAuthentication Error:")
        print(f"   {response.text}")
        
    else:
        print(f"\nError: {response.status_code}")
        print(f"   Response: {response.text[:500]}")
        
except Exception as e:
    print(f"\nException: {str(e)}")
    import traceback
    traceback.print_exc()

print("\n" + "="*80)
