#!/usr/bin/env python3
"""
Simple test to check TitlePoint API connectivity and response
"""
import asyncio
import httpx
import os
from urllib.parse import urlencode

async def test_simple_titlepoint():
    """Test basic TitlePoint API connectivity"""
    
    print("🧪 Testing TitlePoint API Basic Connectivity")
    print("=" * 50)
    
    # Test credentials
    user_id = os.getenv("TITLEPOINT_USER_ID", "PCTXML01")
    password = os.getenv("TITLEPOINT_PASSWORD", "AlphaOmega637#")
    
    print(f"🔑 User ID: {user_id}")
    print(f"🔑 Password: {'*' * len(password)}")
    
    # Test different endpoints
    endpoints_to_test = [
        "https://www.titlepoint.com/TitlePointServices/TpsService.asmx",
        "https://www.titlepoint.com/TitlePointServices/TpsService.asmx?WSDL",
        "https://www.titlepoint.com/TitlePointServices/TpsService.asmx/CreateService3",
        "https://api.titlepoint.com/RequestSummary"
    ]
    
    for endpoint in endpoints_to_test:
        print(f"\n🌐 Testing endpoint: {endpoint}")
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(endpoint)
                print(f"📡 Status: {response.status_code}")
                print(f"📏 Length: {len(response.text)}")
                print(f"📋 Headers: {dict(response.headers)}")
                print(f"📄 Content Preview: {response.text[:200]}...")
                
        except Exception as e:
            print(f"❌ Error: {e}")
    
    # Test POST to CreateService3 with minimal data
    print(f"\n🧪 Testing POST to CreateService3...")
    try:
        post_data = {
            'userID': user_id,
            'password': password,
            'state': 'CA',
            'county': 'Los Angeles',
            'serviceType': 'TitlePoint.Geo.Property',
            'parameters': 'Address.FullAddress=1358 5th St. La Verne, CA 91750;'
        }
        
        endpoint = "https://www.titlepoint.com/TitlePointServices/TpsService.asmx/CreateService3"
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                endpoint,
                data=post_data,
                headers={
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'text/xml, application/xml'
                }
            )
            
            print(f"📡 POST Status: {response.status_code}")
            print(f"📏 POST Length: {len(response.text)}")
            print(f"📋 POST Headers: {dict(response.headers)}")
            print(f"📄 POST Content: {response.text}")
            
    except Exception as e:
        print(f"❌ POST Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_simple_titlepoint())
