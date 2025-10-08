"""
Phase 5-Prequal B: End-to-End PDF Generation Test
Tests both old and new (pixel-perfect) endpoints
"""
import requests
import json
import os
from datetime import datetime

# Configuration
BACKEND_URL = os.getenv("BACKEND_URL", "https://deedpro-main-api.onrender.com")
JWT_TOKEN = os.getenv("JWT_TOKEN", "")  # Set via environment variable

# Test payload
test_payload = {
    "requested_by": "Test User - Phase 5-Prequal B",
    "title_company": "DeedPro Test Title Company",
    "escrow_no": "TEST-2025-001",
    "title_order_no": "ORDER-2025-001",
    "return_to": {
        "name": "Test Recipient",
        "company": "Test Company",
        "address1": "123 Test Street",
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
    "grantees_text": "ALICE SMITH",
    "county": "Los Angeles",
    "legal_description": "LOT 5, BLOCK 2, TRACT NO. 12345, AS PER MAP RECORDED IN BOOK 123 PAGE 45 OF MAPS, IN THE OFFICE OF THE COUNTY RECORDER OF SAID COUNTY.",
    "execution_date": datetime.now().strftime("%Y-%m-%d"),
    "recorder_profile": {"id": "los_angeles"}
}

def test_endpoint(endpoint_name, url, payload, token):
    """Test a PDF generation endpoint"""
    print(f"\n{'='*80}")
    print(f"Testing: {endpoint_name}")
    print(f"URL: {url}")
    print(f"{'='*80}")
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }
    
    try:
        # Make request
        start_time = datetime.now()
        response = requests.post(url, json=payload, headers=headers)
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        
        # Check response
        print(f"✅ Status Code: {response.status_code}")
        print(f"✅ Response Time: {duration:.2f}s")
        
        # Check headers
        print(f"\n📋 Response Headers:")
        interesting_headers = [
            'Content-Type', 'Content-Disposition', 
            'X-Generation-Time', 'X-Request-ID', 
            'X-PDF-Engine', 'X-Phase'
        ]
        for header in interesting_headers:
            if header in response.headers:
                print(f"   {header}: {response.headers[header]}")
        
        if response.status_code == 200:
            # Save PDF
            filename = f"test_{endpoint_name.replace(' ', '_').lower()}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
            with open(filename, 'wb') as f:
                f.write(response.content)
            
            file_size = len(response.content)
            print(f"\n✅ PDF Generated Successfully!")
            print(f"   File: {filename}")
            print(f"   Size: {file_size:,} bytes ({file_size/1024:.1f} KB)")
            
            return {
                "success": True,
                "status_code": response.status_code,
                "duration": duration,
                "file_size": file_size,
                "filename": filename,
                "headers": dict(response.headers)
            }
        else:
            print(f"\n❌ Error: {response.status_code}")
            print(f"   Response: {response.text[:500]}")
            return {
                "success": False,
                "status_code": response.status_code,
                "error": response.text
            }
            
    except Exception as e:
        print(f"\n❌ Exception: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

def main():
    """Run end-to-end tests"""
    print("\n" + "="*80)
    print("🚀 PHASE 5-PREQUAL B: END-TO-END PDF GENERATION TEST")
    print("="*80)
    
    if not JWT_TOKEN:
        print("\n⚠️  WARNING: No JWT_TOKEN set. You'll need to authenticate manually.")
        print("   Set JWT_TOKEN environment variable with a valid token.")
        print("\n   To get a token:")
        print("   1. Log into DeedPro frontend")
        print("   2. Open browser DevTools → Application → Local Storage")
        print("   3. Copy 'access_token' value")
        print("   4. Set: export JWT_TOKEN='your_token_here'")
        print("\n   Continuing with test payload only...\n")
        
        # Just show the payload
        print("📋 Test Payload:")
        print(json.dumps(test_payload, indent=2))
        return
    
    results = {}
    
    # Test 1: Old Endpoint (Legacy)
    results['legacy'] = test_endpoint(
        "Legacy Endpoint",
        f"{BACKEND_URL}/api/generate/grant-deed-ca",
        test_payload,
        JWT_TOKEN
    )
    
    # Test 2: New Endpoint (Pixel-Perfect - WeasyPrint)
    results['pixel_weasyprint'] = test_endpoint(
        "Pixel-Perfect (WeasyPrint)",
        f"{BACKEND_URL}/api/generate/grant-deed-ca-pixel?engine=weasyprint",
        test_payload,
        JWT_TOKEN
    )
    
    # Summary
    print("\n" + "="*80)
    print("📊 TEST SUMMARY")
    print("="*80)
    
    for name, result in results.items():
        print(f"\n{name.upper()}:")
        if result['success']:
            print(f"  ✅ Success")
            print(f"  ⏱️  Duration: {result['duration']:.2f}s")
            print(f"  📄 File Size: {result['file_size']:,} bytes")
            print(f"  💾 Saved: {result['filename']}")
        else:
            print(f"  ❌ Failed: {result.get('error', 'Unknown error')}")
    
    # Comparison
    if results['legacy']['success'] and results['pixel_weasyprint']['success']:
        print("\n📊 COMPARISON:")
        legacy_time = results['legacy']['duration']
        pixel_time = results['pixel_weasyprint']['duration']
        legacy_size = results['legacy']['file_size']
        pixel_size = results['pixel_weasyprint']['file_size']
        
        print(f"  Performance:")
        print(f"    Legacy:       {legacy_time:.2f}s")
        print(f"    Pixel-Perfect: {pixel_time:.2f}s")
        print(f"    Difference:    {abs(pixel_time - legacy_time):.2f}s ({((pixel_time/legacy_time - 1) * 100):.1f}%)")
        
        print(f"\n  File Size:")
        print(f"    Legacy:        {legacy_size:,} bytes")
        print(f"    Pixel-Perfect: {pixel_size:,} bytes")
        print(f"    Difference:    {abs(pixel_size - legacy_size):,} bytes ({((pixel_size/legacy_size - 1) * 100):.1f}%)")
    
    print("\n" + "="*80)
    print("🎯 NEXT STEPS:")
    print("="*80)
    print("1. ✅ Review generated PDFs visually")
    print("2. ✅ Verify pixel-perfect positioning")
    print("3. ✅ Compare with legacy PDF")
    print("4. ✅ Check performance metrics")
    print("5. ⏭️  Update Cypress tests")
    print("6. ⏭️  Enable feature flag for production")
    print("="*80 + "\n")

if __name__ == "__main__":
    main()

