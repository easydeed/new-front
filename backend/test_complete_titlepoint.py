#!/usr/bin/env python3
"""
Test TitlePoint API with all required parameters including customerRef
"""
import asyncio
import httpx
import random
import string

async def test_complete_titlepoint():
    """Test TitlePoint API with all required parameters"""
    
    print("🧪 Testing TitlePoint API with ALL Required Parameters")
    print("=" * 58)
    
    # Generate order and customer reference numbers
    order_no = f"DEED_{random.randint(1000, 9999)}"
    customer_ref = f"CUST_{random.randint(100, 999)}"
    
    # Test credentials
    user_id = "PCTXML01"
    password = "AlphaOmega637#"
    
    print(f"🔑 User ID: {user_id}")
    print(f"🔑 Password: {'*' * len(password)}")
    print(f"📋 Order No: {order_no}")
    print(f"👤 Customer Ref: {customer_ref}")
    
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
    
    print(f"🔧 Parameters: {parameters}")
    
    try:
        post_data = {
            'userID': user_id,
            'password': password,
            'orderNo': order_no,
            'customerRef': customer_ref,  # This was also missing!
            'state': 'CA',
            'county': 'Los Angeles',
            'serviceType': 'TitlePoint.Geo.Property',
            'parameters': parameters
        }
        
        print(f"\n📤 POST Data: {post_data}")
        
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
                print("✅ SUCCESS! CreateService3 call worked!")
                
                # Try to extract RequestID from the response
                import xml.etree.ElementTree as ET
                try:
                    root = ET.fromstring(response.text)
                    print(f"🔍 XML Root: {root.tag}")
                    
                    # Look for RequestID or similar
                    request_id = None
                    for elem in root.iter():
                        print(f"   Element: {elem.tag} = {elem.text}")
                        if elem.text and elem.text.isdigit():
                            request_id = elem.text
                            print(f"🎯 Found RequestID: {request_id}")
                    
                    if request_id:
                        print(f"✅ Successfully got RequestID: {request_id}")
                        
                        # Wait a moment for processing
                        print("\n⏳ Waiting 5 seconds for processing...")
                        await asyncio.sleep(5)
                        
                        # Now test getting the result
                        await test_get_result(user_id, password, request_id)
                    else:
                        print("⚠️ No clear RequestID found in response")
                        
                except Exception as parse_error:
                    print(f"❌ XML parsing error: {parse_error}")
                    
            else:
                print(f"❌ CreateService3 failed with status {response.status_code}")
                print(f"💬 Error: {response.text}")
            
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
        
        print(f"📤 GetResult Data: {post_data}")
        
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
            
            print(f"\n📡 GetResult Status: {response.status_code}")
            print(f"📏 GetResult Length: {len(response.text)}")
            print(f"📄 GetResult Content: {response.text[:2000]}...")
            
            if response.status_code == 200:
                print("✅ SUCCESS! GetResultByRequestID worked!")
                
                # Try to parse the result for property data
                try:
                    import xml.etree.ElementTree as ET
                    root = ET.fromstring(response.text)
                    
                    print(f"\n🔍 Parsing result XML...")
                    property_data = {}
                    
                    for elem in root.iter():
                        if elem.text and elem.text.strip():
                            tag_name = elem.tag.split('}')[-1] if '}' in elem.tag else elem.tag
                            print(f"   {tag_name}: {elem.text}")
                            
                            # Look for key property fields
                            if 'APN' in tag_name.upper() or 'PARCEL' in tag_name.upper():
                                property_data['apn'] = elem.text
                            elif 'LEGAL' in tag_name.upper() and 'DESCRIPTION' in tag_name.upper():
                                property_data['legal_description'] = elem.text
                            elif 'OWNER' in tag_name.upper() and 'PRIMARY' in tag_name.upper():
                                property_data['primary_owner'] = elem.text
                            elif 'OWNER' in tag_name.upper() and 'SECONDARY' in tag_name.upper():
                                property_data['secondary_owner'] = elem.text
                    
                    if property_data:
                        print(f"\n🎉 EXTRACTED PROPERTY DATA:")
                        for key, value in property_data.items():
                            print(f"   {key}: {value}")
                    else:
                        print(f"\n⚠️ No property data fields identified in response")
                        
                except Exception as parse_error:
                    print(f"❌ Result parsing error: {parse_error}")
            else:
                print(f"❌ GetResultByRequestID failed with status {response.status_code}")
            
    except Exception as e:
        print(f"❌ GetResult Error: {e}")


if __name__ == "__main__":
    asyncio.run(test_complete_titlepoint())
