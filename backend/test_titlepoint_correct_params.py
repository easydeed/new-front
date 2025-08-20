#!/usr/bin/env python3
"""
Test TitlePoint with correct parameter signatures based on WSDL inspection
"""
from zeep import Client

def test_property_lookup_correct():
    """Test PropertyLookup with correct parameters"""
    print("🔍 TESTING TITLEPOINT PROPERTYLOOKUP WITH CORRECT PARAMETERS")
    print("=" * 65)
    
    try:
        client = Client("https://www.titlepoint.com/TitlePointServices/TpsService.asmx?WSDL")
        
        # WSDL signature: userID, password, company, department, titleOfficer, 
        # fipsCode, state, county, parameters
        
        print(f"✅ SOAP Client initialized")
        print(f"📋 Using correct PropertyLookup signature from WSDL")
        
        response = client.service.PropertyLookup(
            userID="PCTXML01",
            password="AlphaOmega637#",
            company="",  # Empty string
            department="",  # Empty string  
            titleOfficer="",  # Empty string
            fipsCode="",  # Empty - will be determined by state/county
            state="CA",
            county="Los Angeles",
            parameters="1358 5th St. La Verne, CA 91750"  # Address as parameters
        )
        
        print(f"✅ PropertyLookup call completed")
        print(f"📄 Return Status: {response.ReturnStatus}")
        
        if response.ReturnStatus == "Success":
            print(f"🎉 PROPERTY LOOKUP SUCCESS!")
            
            # Print response data
            if hasattr(response, '__dict__'):
                print(f"\n📖 Response data:")
                for key, value in response.__dict__.items():
                    print(f"   {key}: {value}")
            
            return response
        else:
            print(f"⚠️ PropertyLookup failed")
            if hasattr(response, 'ReturnErrors') and response.ReturnErrors:
                print(f"❌ Errors: {response.ReturnErrors}")
            
            print(f"\n🔍 Full response:")
            print(f"   {response}")
            
        return response
        
    except Exception as e:
        print(f"❌ PropertyLookup error: {str(e)}")
        return None

def test_create_service_correct():
    """Test CreateService with correct parameters"""
    print(f"\n🔍 TESTING CREATESERVICE WITH CORRECT PARAMETERS")
    print("=" * 55)
    
    try:
        client = Client("https://www.titlepoint.com/TitlePointServices/TpsService.asmx?WSDL")
        
        # Based on WSDL signature for CreateService
        response = client.service.CreateService(
            userID="PCTXML01",
            password="AlphaOmega637#",
            company="",
            department="",
            titleUnit="",
            orderNo="",
            customerRef="",
            serviceType="PropertyProfile",  # Try a basic service type
            streetAddr="1358 5th St",
            streetAddr2="",
            city="La Verne",
            state="CA",
            zip="91750",
            county="Los Angeles",
            apn="",  # We don't have APN yet
            names="",
            searchFromDate="",
            searchToDate="",
            book="",
            page="",
            fromLot="",
            toLot="",
            section="",
            block="",
            township="",
            range="",
            quarter="",
            docType="",
            partyType="",
            getExtensions="",
            orderComment="",
            starterRemarks=""
        )
        
        print(f"✅ CreateService call completed")
        print(f"📄 Return Status: {response.ReturnStatus}")
        
        if response.ReturnStatus == "Success":
            print(f"🎉 CREATE SERVICE SUCCESS!")
            print(f"📋 Request ID: {getattr(response, 'RequestID', 'Not found')}")
            return response
        else:
            print(f"⚠️ CreateService failed")
            if hasattr(response, 'ReturnErrors') and response.ReturnErrors:
                errors = response.ReturnErrors
                if hasattr(errors, 'ReturnError'):
                    error_list = errors.ReturnError
                    if isinstance(error_list, list):
                        for error in error_list:
                            if hasattr(error, 'ErrorDescription'):
                                print(f"   ❌ Error: {error.ErrorDescription}")
                    else:
                        if hasattr(error_list, 'ErrorDescription'):
                            print(f"   ❌ Error: {error_list.ErrorDescription}")
            
        return response
        
    except Exception as e:
        print(f"❌ CreateService error: {str(e)}")
        return None

if __name__ == "__main__":
    print("🧪 TESTING TITLEPOINT WITH CORRECT API SIGNATURES")
    print("=" * 60)
    print("📍 Test Address: 1358 5th St. La Verne, CA 91750")
    print("=" * 60)
    
    # Test PropertyLookup first
    property_result = test_property_lookup_correct()
    
    # Test CreateService
    create_result = test_create_service_correct()
    
    # Summary
    print(f"\n📊 SUMMARY")
    print("=" * 30)
    
    if property_result and hasattr(property_result, 'ReturnStatus'):
        property_status = property_result.ReturnStatus
        print(f"🔍 PropertyLookup: {property_status}")
    else:
        print(f"🔍 PropertyLookup: Failed")
    
    if create_result and hasattr(create_result, 'ReturnStatus'):
        create_status = create_result.ReturnStatus
        print(f"🏗️ CreateService: {create_status}")
    else:
        print(f"🏗️ CreateService: Failed")
        
    if (property_result and getattr(property_result, 'ReturnStatus', '') == "Success") or \
       (create_result and getattr(create_result, 'ReturnStatus', '') == "Success"):
        print(f"\n🎉 SUCCESS: Found working TitlePoint method!")
    else:
        print(f"\n⚠️ Both methods failed - may need different approach or account verification")

