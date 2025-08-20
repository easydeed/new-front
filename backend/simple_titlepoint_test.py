#!/usr/bin/env python3
"""
Simple TitlePoint service test to find working service types
"""
from zeep import Client

def test_simple_titlepoint():
    """Test the most basic TitlePoint services"""
    print("🔍 TESTING BASIC TITLEPOINT SERVICES")
    print("=" * 50)
    
    try:
        # Initialize client
        client = Client("https://www.titlepoint.com/TitlePointServices/TpsService.asmx?WSDL")
        
        # Test the most basic service types
        basic_services = [
            "PropertyProfile",
            "Property",
            "Address", 
            "Search",
            "Basic"
        ]
        
        user_id = "PCTXML01"
        password = "AlphaOmega637#"
        state = "CA"
        county = "Los Angeles"
        address = "1358 5th St. La Verne, CA 91750"
        
        for service_type in basic_services:
            try:
                print(f"\n🧪 Testing: {service_type}")
                
                response = client.service.CreateService3(
                    userID=user_id,
                    password=password,
                    state=state,
                    county=county,
                    parameters=f"Address={address}",
                    serviceType=service_type
                )
                
                print(f"   Status: {response.ReturnStatus}")
                
                if response.ReturnStatus == "Success":
                    print(f"   ✅ SUCCESS! Request ID: {response.RequestID}")
                    return service_type, response.RequestID
                else:
                    if hasattr(response, 'ReturnErrors') and response.ReturnErrors:
                        errors = response.ReturnErrors
                        if hasattr(errors, 'ReturnError'):
                            error_list = errors.ReturnError
                            if isinstance(error_list, list):
                                for error in error_list:
                                    print(f"   ❌ Error: {error}")
                            else:
                                print(f"   ❌ Error: {error_list}")
                    
            except Exception as e:
                print(f"   💥 Exception: {str(e)}")
        
        print(f"\n❌ No working service types found")
        return None, None
        
    except Exception as e:
        print(f"❌ Failed to test TitlePoint: {str(e)}")
        return None, None

if __name__ == "__main__":
    service_type, request_id = test_simple_titlepoint()
    if service_type:
        print(f"\n🎉 Found working service: {service_type}")
        print(f"📋 Request ID: {request_id}")
    else:
        print(f"\n⚠️ No working services found - may need different credentials or service types")

