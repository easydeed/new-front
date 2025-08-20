#!/usr/bin/env python3
"""
Quick test for vesting data with correct maxWaitSeconds parameter
"""
from zeep import Client
import time

def test_vesting_data():
    """Test vesting data retrieval with correct parameters"""
    print("🔍 QUICK VESTING DATA TEST")
    print("=" * 40)
    
    try:
        client = Client("https://www.titlepoint.com/TitlePointServices/TpsService.asmx?WSDL")
        
        # We already have some request IDs from previous tests that worked
        # Let's try to get results from those
        working_request_ids = [
            "765105405",  # TitlePoint.Geo.Property 
            "765105410",  # TitlePoint.Geo.Address
            "765105411"   # TitlePoint.Geo.Tax
        ]
        
        for i, request_id in enumerate(working_request_ids):
            service_names = ["Property", "Address", "Tax"]
            print(f"\n📋 Testing results for {service_names[i]} service (ID: {request_id})")
            
            try:
                result_response = client.service.GetResultByRequestID(
                    userID="PCTXML01",
                    password="AlphaOmega637#",
                    company="",
                    department="",
                    titleOfficer="",
                    requestId=int(request_id),
                    maxWaitSeconds=20  # Max allowed value
                )
                
                print(f"   📄 Status: {result_response.ReturnStatus}")
                
                if result_response.ReturnStatus == "Success":
                    print(f"   ✅ SUCCESS! Got data from {service_names[i]} service!")
                    
                    if hasattr(result_response, 'ResultData') and result_response.ResultData:
                        result_data = str(result_response.ResultData)
                        
                        # Check for vesting/ownership keywords
                        vesting_keywords = ['owner', 'vesting', 'legal', 'deed', 'grantor', 'grantee']
                        found_keywords = [kw for kw in vesting_keywords if kw.lower() in result_data.lower()]
                        
                        if found_keywords:
                            print(f"   🎉 VESTING DATA FOUND! Keywords: {found_keywords}")
                            
                            # Show relevant sections
                            lines = result_data.split('\n')
                            for line in lines[:10]:  # First 10 lines
                                if any(kw.lower() in line.lower() for kw in vesting_keywords):
                                    print(f"      📋 {line.strip()}")
                        else:
                            print(f"   ⚠️ No obvious vesting data in {service_names[i]} service")
                            
                        # Show data length
                        print(f"   📊 Data length: {len(result_data)} characters")
                        
                elif "pending" in result_response.ReturnStatus.lower():
                    print(f"   ⏳ Still processing...")
                else:
                    print(f"   ❌ Failed: {result_response.ReturnStatus}")
                    
            except Exception as e:
                print(f"   💥 Error: {str(e)}")
        
        # Try creating a new Address service which seemed to work well
        print(f"\n🆕 Creating fresh TitlePoint.Geo.Address request...")
        
        response = client.service.CreateService3(
            userID="PCTXML01",
            password="AlphaOmega637#",
            state="CA",
            county="Los Angeles",
            serviceType="TitlePoint.Geo.Address",
            parameters="Address.FullAddress=1358 5th St. La Verne, CA 91750"
        )
        
        if response.ReturnStatus == "Success":
            request_id = response.RequestID
            print(f"   ✅ New Address service created: {request_id}")
            
            # Wait and try to get immediate results
            print(f"   ⏳ Waiting 5 seconds...")
            time.sleep(5)
            
            result_response = client.service.GetResultByRequestID(
                userID="PCTXML01",
                password="AlphaOmega637#",
                company="",
                department="",
                titleOfficer="",
                requestId=int(request_id),
                maxWaitSeconds=20
            )
            
            print(f"   📄 Fresh result status: {result_response.ReturnStatus}")
            
            if result_response.ReturnStatus == "Success":
                print(f"   🎉 FRESH RESULT SUCCESS!")
                if hasattr(result_response, 'ResultData'):
                    data = str(result_response.ResultData)
                    print(f"   📊 Fresh data length: {len(data)} characters")
                    
                    # Look for owner/vesting info
                    if any(kw in data.lower() for kw in ['owner', 'vesting', 'legal']):
                        print(f"   ✅ CONTAINS VESTING INFORMATION!")
                    else:
                        print(f"   ⚠️ May not contain detailed vesting data")
        
    except Exception as e:
        print(f"❌ Test failed: {str(e)}")

if __name__ == "__main__":
    test_vesting_data()
