#!/usr/bin/env python3
"""
Test TitlePoint API with ALL required parameters including orderComment
"""
import asyncio
import httpx
import random
import string

async def test_ultimate_titlepoint():
    """Test TitlePoint API with all required parameters"""
    
    print("🧪 Testing TitlePoint API with ALL Required Parameters (Ultimate)")
    print("=" * 68)
    
    # Generate order and customer reference numbers
    order_no = f"DEED_{random.randint(1000, 9999)}"
    customer_ref = f"CUST_{random.randint(100, 999)}"
    
    # Test credentials (from Pacific Coast Title integration)
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
        # Include ALL required parameters discovered through testing
        post_data = {
            'userID': user_id,
            'password': password,
            'orderNo': order_no,
            'customerRef': customer_ref,
            'company': 'DeedPro',
            'department': '',
            'titleOfficer': '',
            'orderComment': f'DeedPro Property Search for {order_no}',  # The final missing parameter!
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
                print("\n🎉 SUCCESS! CreateService3 call worked!")
                
                # Try to extract RequestID from the response
                import xml.etree.ElementTree as ET
                try:
                    root = ET.fromstring(response.text)
                    print(f"\n🔍 XML Root: {root.tag}")
                    
                    # Look for RequestID - more thorough search
                    request_id = None
                    for elem in root.iter():
                        if elem.text:
                            tag_name = elem.tag.split('}')[-1] if '}' in elem.tag else elem.tag
                            text_value = elem.text.strip()
                            print(f"   Element: {tag_name} = {text_value}")
                            
                            # Look for numeric RequestID
                            if text_value.isdigit() and len(text_value) > 3:  # Reasonable RequestID length
                                request_id = text_value
                                print(f"🎯 Found RequestID: {request_id}")
                    
                    if request_id:
                        print(f"\n✅ Successfully got RequestID: {request_id}")
                        print(f"🚀 TitlePoint service request created successfully!")
                        
                        # Wait for processing
                        print("\n⏳ Waiting 15 seconds for TitlePoint processing...")
                        await asyncio.sleep(15)
                        
                        # Now test getting the result
                        await test_get_result(user_id, password, request_id)
                    else:
                        print(f"\n⚠️ No clear RequestID found in response")
                        # Still a success if we got HTTP 200
                        print(f"✅ But CreateService3 HTTP call succeeded!")
                        
                except Exception as parse_error:
                    print(f"❌ XML parsing error: {parse_error}")
                    # Still a success if we got HTTP 200
                    print(f"✅ But CreateService3 HTTP call succeeded!")
                    
            else:
                print(f"❌ CreateService3 failed with status {response.status_code}")
                print(f"💬 Error: {response.text}")
            
    except Exception as e:
        print(f"❌ POST Error: {e}")


async def test_get_result(user_id: str, password: str, request_id: str):
    """Test getting results using GetResultByRequestID"""
    
    print(f"\n🔍 Testing GetResultByRequestID for request {request_id}...")
    
    # Try multiple times as the service may need time to process
    for attempt in range(3):
        try:
            post_data = {
                'userID': user_id,
                'password': password,
                'company': 'DeedPro',
                'department': '',
                'titleOfficer': '',
                'requestId': request_id,
                'maxWaitSeconds': 20
            }
            
            print(f"\n🔄 Attempt {attempt + 1}: GetResult Data: {post_data}")
            
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
                
                if response.status_code == 200:
                    print(f"✅ SUCCESS! GetResultByRequestID worked on attempt {attempt + 1}!")
                    print(f"📄 GetResult Content: {response.text[:3000]}...")
                    
                    # Try to parse the result for property data
                    try:
                        import xml.etree.ElementTree as ET
                        root = ET.fromstring(response.text)
                        
                        print(f"\n🔍 Parsing result XML for property data...")
                        property_data = {}
                        all_elements = []
                        
                        # Collect all elements with text
                        for elem in root.iter():
                            if elem.text and elem.text.strip():
                                tag_name = elem.tag.split('}')[-1] if '}' in elem.tag else elem.tag
                                text_value = elem.text.strip()
                                all_elements.append((tag_name, text_value))
                                
                                # Look for key property fields (case insensitive)
                                tag_upper = tag_name.upper()
                                if any(keyword in tag_upper for keyword in ['APN', 'PARCEL', 'ASSESSOR']):
                                    property_data['apn'] = text_value
                                elif 'LEGAL' in tag_upper and any(word in tag_upper for word in ['DESC', 'BRIEF']):
                                    property_data['legal_description'] = text_value
                                elif 'OWNER' in tag_upper and 'PRIMARY' in tag_upper:
                                    property_data['primary_owner'] = text_value
                                elif 'OWNER' in tag_upper and 'SECONDARY' in tag_upper:
                                    property_data['secondary_owner'] = text_value
                                elif 'OWNER' in tag_upper and 'NAME' in tag_upper:
                                    if 'primary_owner' not in property_data:
                                        property_data['primary_owner'] = text_value
                        
                        print(f"\n📋 All XML Elements Found ({len(all_elements)}):")
                        for tag, value in all_elements[:20]:  # Show first 20
                            print(f"   {tag}: {value}")
                        if len(all_elements) > 20:
                            print(f"   ... and {len(all_elements) - 20} more")
                        
                        if property_data:
                            print(f"\n🎉 EXTRACTED PROPERTY DATA:")
                            for key, value in property_data.items():
                                print(f"   ✅ {key}: {value}")
                            
                            print(f"\n🚀 TITLEPOINT INTEGRATION SUCCESSFUL!")
                            print(f"📋 Ready to integrate into DeedPro wizard!")
                            
                        else:
                            print(f"\n⚠️ No specific property data fields identified")
                            print(f"💡 But API returned data - may need field mapping analysis")
                            
                        return True  # Success!
                        
                    except Exception as parse_error:
                        print(f"❌ Result parsing error: {parse_error}")
                else:
                    print(f"⚠️ GetResultByRequestID attempt {attempt + 1} failed: {response.status_code}")
                    print(f"📄 Response: {response.text}")
                
                # Wait before next attempt
                if attempt < 2:  # Don't wait after last attempt
                    print(f"⏳ Waiting 10 seconds before next attempt...")
                    await asyncio.sleep(10)
                
        except Exception as e:
            print(f"❌ GetResult Attempt {attempt + 1} Error: {e}")
    
    print(f"\n🏁 Completed all GetResult attempts")
    return False


if __name__ == "__main__":
    asyncio.run(test_ultimate_titlepoint())
