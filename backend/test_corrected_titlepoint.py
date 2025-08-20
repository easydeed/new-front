#!/usr/bin/env python3
"""
Test TitlePoint API with corrected parameters including orderNo
"""
import asyncio
import httpx
import random
import string

async def test_corrected_titlepoint():
    """Test TitlePoint API with all required parameters"""
    
    print("🧪 Testing TitlePoint API with Corrected Parameters")
    print("=" * 55)
    
    # Generate a random order number (Pacific Coast Title likely uses this)
    order_no = ''.join(random.choices(string.ascii_uppercase + string.digits, k=10))
    
    # Test credentials
    user_id = "PCTXML01"
    password = "AlphaOmega637#"
    
    print(f"🔑 User ID: {user_id}")
    print(f"🔑 Password: {'*' * len(password)}")
    print(f"📋 Order No: {order_no}")
    
    # Test POST to CreateService3 with all required parameters
    print(f"\n🧪 Testing POST to CreateService3 with orderNo...")
    
    # Pacific Coast Title's parameter format
    parameters = (
        "Address.FullAddress=1358 5th St. La Verne, CA 91750;"
        "General.AutoSearchTaxes=False;"
        "Tax.CurrentYearTaxesOnly=False;"
        "General.AutoSearchProperty=True;"
        "General.AutoSearchOwnerNames=False;"
        "General.AutoSearchStarters=False;"
        "Property.IntelligentPropertyGrouping=true;"
    )
    
    try:
        post_data = {
            'userID': user_id,
            'password': password,
            'orderNo': order_no,  # This was missing!
            'state': 'CA',
            'county': 'Los Angeles',
            'serviceType': 'TitlePoint.Geo.Property',
            'parameters': parameters
        }
        
        print(f"📤 POST Data: {post_data}")
        
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
            
            print(f"\n📡 POST Status: {response.status_code}")
            print(f"📏 POST Length: {len(response.text)}")
            print(f"📋 POST Headers: {dict(response.headers)}")
            print(f"📄 POST Content: {response.text}")
            
            if response.status_code == 200:
                # Try to extract RequestID from the response
                import xml.etree.ElementTree as ET
                try:
                    root = ET.fromstring(response.text)
                    # Look for RequestID or similar
                    request_id = None
                    for elem in root.iter():
                        if elem.text and (elem.text.isdigit() or 'request' in elem.tag.lower()):
                            print(f"🔍 Potential RequestID: {elem.tag} = {elem.text}")
                            if elem.text.isdigit():
                                request_id = elem.text
                    
                    if request_id:
                        print(f"✅ Successfully got RequestID: {request_id}")
                        
                        # Now test getting the result
                        await test_get_result(user_id, password, request_id)
                    else:
                        print("⚠️ No clear RequestID found in response")
                        
                except Exception as parse_error:
                    print(f"❌ XML parsing error: {parse_error}")
            else:
                print(f"❌ CreateService3 failed with status {response.status_code}")
            
    except Exception as e:
        print(f"❌ POST Error: {e}")


async def test_get_result(user_id: str, password: str, request_id: str):
    """Test getting results using GetResultByRequestID"""
    
    print(f"\n🔍 Testing GetResultByRequestID for request {request_id}...")
    
    try:
        post_data = {
            'userID': user_id,
            'password': password,
            'company': '',
            'department': '',
            'titleOfficer': '',
            'requestId': request_id,
            'maxWaitSeconds': 20
        }
        
        endpoint = "https://www.titlepoint.com/TitlePointServices/TpsService.asmx/GetResultByRequestID"
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                endpoint,
                data=post_data,
                headers={
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'text/xml, application/xml'
                }
            )
            
            print(f"📡 GetResult Status: {response.status_code}")
            print(f"📏 GetResult Length: {len(response.text)}")
            print(f"📄 GetResult Content: {response.text[:1000]}...")
            
    except Exception as e:
        print(f"❌ GetResult Error: {e}")


if __name__ == "__main__":
    asyncio.run(test_corrected_titlepoint())
