#!/usr/bin/env python3
"""
Test TitlePoint PropertyLookup method - the correct approach for property searches
"""
from zeep import Client

def test_property_lookup():
    """Test TitlePoint PropertyLookup method"""
    print("🔍 TESTING TITLEPOINT PROPERTYLOOKUP METHOD")
    print("=" * 55)
    
    try:
        # Initialize SOAP client
        client = Client("https://www.titlepoint.com/TitlePointServices/TpsService.asmx?WSDL")
        
        print(f"✅ SOAP Client initialized")
        
        # Test credentials
        user_id = "PCTXML01"
        password = "AlphaOmega637#"
        
        # Test address
        address = "1358 5th St. La Verne, CA 91750"
        state = "CA"
        county = "Los Angeles"
        
        print(f"🏠 Test Address: {address}")
        print(f"🗺️ State: {state}, County: {county}")
        
        # Try PropertyLookup method
        print(f"\n🚀 Calling PropertyLookup...")
        
        response = client.service.PropertyLookup(
            userID=user_id,
            password=password,
            state=state,
            county=county,
            searchString=address
        )
        
        print(f"✅ PropertyLookup call completed")
        print(f"📊 Response type: {type(response)}")
        print(f"📋 Response attributes: {dir(response)}")
        
        # Check response status
        if hasattr(response, 'ReturnStatus'):
            print(f"📄 Return Status: {response.ReturnStatus}")
            
            if response.ReturnStatus == "Success":
                print(f"🎉 PropertyLookup SUCCESS!")
                
                # Print all available data
                if hasattr(response, '__dict__'):
                    print(f"\n📖 Response data:")
                    for key, value in response.__dict__.items():
                        print(f"   {key}: {value}")
                
                return response
                
            else:
                print(f"⚠️ PropertyLookup failed")
                
                # Check for errors
                if hasattr(response, 'ReturnErrors') and response.ReturnErrors:
                    errors = response.ReturnErrors
                    if hasattr(errors, 'ReturnError'):
                        error_list = errors.ReturnError
                        if isinstance(error_list, list):
                            for error in error_list:
                                print(f"   ❌ Error: {error}")
                        else:
                            print(f"   ❌ Error: {error_list}")
                
                # Print full response for debugging
                print(f"\n🔍 Full response:")
                print(f"   {response}")
        else:
            print(f"❓ Unexpected response structure")
            print(f"   {response}")
        
        return response
        
    except Exception as e:
        print(f"❌ PropertyLookup failed: {str(e)}")
        print(f"🔍 Error type: {type(e)}")
        return None

def test_alternative_methods():
    """Test other potential property search methods"""
    print(f"\n🧪 TESTING ALTERNATIVE METHODS")
    print("=" * 40)
    
    try:
        client = Client("https://www.titlepoint.com/TitlePointServices/TpsService.asmx?WSDL")
        
        user_id = "PCTXML01"
        password = "AlphaOmega637#"
        address = "1358 5th St. La Verne, CA 91750"
        
        # Try ResolveProperties
        print(f"\n🔍 Testing ResolveProperties...")
        try:
            response = client.service.ResolveProperties(
                userID=user_id,
                password=password,
                addressString=address
            )
            print(f"   ✅ ResolveProperties responded: {response.ReturnStatus}")
            if response.ReturnStatus == "Success":
                print(f"   🎉 ResolveProperties SUCCESS!")
                return "ResolveProperties", response
        except Exception as e:
            print(f"   ❌ ResolveProperties error: {str(e)}")
        
        # Try CreateService with a basic approach
        print(f"\n🔍 Testing CreateService (basic)...")
        try:
            response = client.service.CreateService(
                userID=user_id,
                password=password,
                state="CA",
                county="Los Angeles",
                parameters=f"Address={address}"
            )
            print(f"   ✅ CreateService responded: {response.ReturnStatus}")
            if response.ReturnStatus == "Success":
                print(f"   🎉 CreateService SUCCESS!")
                return "CreateService", response
        except Exception as e:
            print(f"   ❌ CreateService error: {str(e)}")
        
        return None, None
        
    except Exception as e:
        print(f"❌ Alternative methods test failed: {str(e)}")
        return None, None

if __name__ == "__main__":
    # Test PropertyLookup first
    result = test_property_lookup()
    
    if not result or (hasattr(result, 'ReturnStatus') and result.ReturnStatus != "Success"):
        # If PropertyLookup doesn't work, try alternatives
        method, response = test_alternative_methods()
        if method:
            print(f"\n🎯 RECOMMENDATION: Use {method} method instead of CreateService3")
        else:
            print(f"\n⚠️ No working methods found - may need account verification or different approach")
    else:
        print(f"\n🎯 RECOMMENDATION: Use PropertyLookup method - it works!")

