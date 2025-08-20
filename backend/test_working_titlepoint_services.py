#!/usr/bin/env python3
"""
Test TitlePoint with the WORKING service types found in Pacific Coast Title documentation
From: docs/google-titlepoint-integration-guide.md
"""
from zeep import Client

def test_working_service_types():
    """Test the actual working TitlePoint service types from Pacific Coast Title"""
    print("🎉 TESTING WORKING TITLEPOINT SERVICE TYPES")
    print("=" * 55)
    print("📋 From Pacific Coast Title Integration Guide")
    print("=" * 55)
    
    # Working service types from the documentation
    working_services = [
        {
            'name': 'TitlePoint.Geo.Tax',
            'purpose': 'Tax information',
            'parameters': 'Tax.APN=8888-012-012;General.AutoSearchTaxes=true;General.AutoSearchProperty=false'
        },
        {
            'name': 'TitlePoint.Geo.LegalVesting', 
            'purpose': 'Legal/vesting data',
            'parameters': 'LegalVesting.FIPS=06037;LegalVesting.FullAddress=1358 5th St. La Verne, CA 91750'
        },
        {
            'name': 'TitlePoint.Geo.Address',
            'purpose': 'Property details',
            'parameters': 'Address.FullAddress=1358 5th St. La Verne, CA 91750'
        },
        {
            'name': 'TitlePoint.Geo.Property',
            'purpose': 'Property-specific data', 
            'parameters': 'Property.FullAddress=1358 5th St. La Verne, CA 91750'
        }
    ]
    
    try:
        client = Client("https://www.titlepoint.com/TitlePointServices/TpsService.asmx?WSDL")
        
        successful_services = []
        
        for service in working_services:
            try:
                print(f"\n🧪 Testing: {service['name']}")
                print(f"   Purpose: {service['purpose']}")
                print(f"   Parameters: {service['parameters']}")
                
                # Use CreateService3 method as shown in the documentation
                response = client.service.CreateService3(
                    userID="PCTXML01",
                    password="AlphaOmega637#",
                    state="CA",
                    county="Los Angeles",
                    serviceType=service['name'],
                    parameters=service['parameters']
                )
                
                status = response.ReturnStatus
                print(f"   📄 Status: {status}")
                
                if status == "Success":
                    request_id = getattr(response, 'RequestID', 'Unknown')
                    print(f"   ✅ SUCCESS! Request ID: {request_id}")
                    
                    successful_services.append({
                        'service_name': service['name'],
                        'purpose': service['purpose'],
                        'request_id': request_id,
                        'parameters': service['parameters']
                    })
                else:
                    print(f"   ⚠️ Failed: {status}")
                    if hasattr(response, 'ReturnErrors') and response.ReturnErrors:
                        errors = response.ReturnErrors
                        if hasattr(errors, 'ReturnError'):
                            error_list = errors.ReturnError
                            if isinstance(error_list, list):
                                for error in error_list:
                                    if hasattr(error, 'ErrorDescription'):
                                        print(f"      ❌ Error: {error.ErrorDescription}")
                            else:
                                if hasattr(error_list, 'ErrorDescription'):
                                    print(f"      ❌ Error: {error_list.ErrorDescription}")
                    
            except Exception as e:
                print(f"   💥 Exception: {str(e)}")
        
        # Results
        print(f"\n📊 RESULTS SUMMARY")
        print("=" * 40)
        print(f"✅ Working services: {len(successful_services)}")
        print(f"📍 Test Address: 1358 5th St. La Verne, CA 91750")
        
        if successful_services:
            print(f"\n🎉 WORKING SERVICE TYPES FOUND:")
            for service in successful_services:
                print(f"   • {service['service_name']}")
                print(f"     Purpose: {service['purpose']}")
                print(f"     Request ID: {service['request_id']}")
            
            return successful_services
        else:
            print(f"\n⚠️ No services worked - may need parameter adjustments")
            return None
            
    except Exception as e:
        print(f"❌ Test failed: {str(e)}")
        return None

def test_result_retrieval(service_info):
    """Test retrieving results from working services"""
    if not service_info:
        return
        
    print(f"\n🔍 TESTING RESULT RETRIEVAL")
    print("=" * 40)
    
    try:
        client = Client("https://www.titlepoint.com/TitlePointServices/TpsService.asmx?WSDL")
        
        for service in service_info[:2]:  # Test first 2 services
            service_name = service['service_name']
            request_id = service['request_id']
            
            print(f"\n📋 Getting results for: {service_name}")
            print(f"🔍 Request ID: {request_id}")
            
            # Try GetResultByRequestID
            response = client.service.GetResultByRequestID(
                userID="PCTXML01",
                password="AlphaOmega637#",
                requestID=request_id
            )
            
            print(f"📄 Result Status: {response.ReturnStatus}")
            
            if response.ReturnStatus == "Success":
                print(f"🎉 RESULT SUCCESS for {service_name}!")
                
                # Print result data if available
                if hasattr(response, 'ResultData') and response.ResultData:
                    result_preview = str(response.ResultData)[:300] + "..." if len(str(response.ResultData)) > 300 else str(response.ResultData)
                    print(f"📊 Result Data Preview: {result_preview}")
                    
            elif "No data found" in str(response) or "not ready" in str(response).lower():
                print(f"⏳ Results not ready yet for {service_name}")
            else:
                print(f"⚠️ Result retrieval failed for {service_name}")
                
    except Exception as e:
        print(f"❌ Result retrieval error: {str(e)}")

if __name__ == "__main__":
    print("🎯 TESTING PACIFIC COAST TITLE WORKING SERVICE TYPES")
    print("=" * 65)
    print("📍 Source: docs/google-titlepoint-integration-guide.md")
    print("🏠 Test Address: 1358 5th St. La Verne, CA 91750")
    print("=" * 65)
    
    # Test the working service types
    working_services = test_working_service_types()
    
    # Test result retrieval if we have working services
    if working_services:
        test_result_retrieval(working_services)
        
        print(f"\n🎯 IMPLEMENTATION RECOMMENDATION:")
        print(f"✅ Update TitlePoint integration to use these service types:")
        for service in working_services:
            print(f"   • {service['service_name']}")
        
        print(f"\n🔧 NEXT STEPS:")
        print(f"1. Update backend/services/titlepoint_service.py")
        print(f"2. Use service type: '{working_services[0]['service_name']}'")
        print(f"3. Deploy updated integration")
        print(f"4. Test with production API endpoint")
    else:
        print(f"\n📞 STILL NEED SUPPORT:")
        print(f"Contact TitlePoint support at 877.744.3375")
        print(f"Request service types available for account: PCTXML01")
