#!/usr/bin/env python3
"""
Test common TitlePoint service types based on industry patterns
Based on Pacific Coast Title repository findings and common real estate service types
"""
from zeep import Client

def test_common_service_types():
    """Test commonly used TitlePoint service types from real estate industry"""
    print("🔍 TESTING COMMON TITLEPOINT SERVICE TYPES")
    print("=" * 55)
    print("Based on Pacific Coast Title and industry patterns")
    print("=" * 55)
    
    # Common service types used in real estate industry
    common_service_types = [
        # Basic property services
        "Property",
        "PropertyInfo", 
        "PropertyData",
        "PropertyDetail",
        "PropertyReport",
        
        # Address/location services
        "Address",
        "AddressSearch",
        "AddressValidation",
        "AddressLookup",
        
        # Ownership services
        "Owner",
        "OwnerInfo",
        "OwnershipData", 
        "CurrentOwner",
        "Vesting",
        
        # Legal services
        "Legal",
        "LegalDesc",
        "LegalDescription",
        "Deed",
        "DeedInfo",
        
        # Tax services
        "Tax",
        "TaxInfo",
        "TaxData",
        "Assessment",
        "TaxAssessment",
        
        # Generic services
        "Search",
        "Lookup",
        "Info",
        "Data",
        "Report",
        "Basic",
        "Standard",
        
        # Title services (common in title companies)
        "Title",
        "TitleSearch", 
        "TitleReport",
        "TitleInfo",
        
        # Document services
        "Document",
        "DocSearch",
        "Recording",
        "PublicRecord",
        
        # APN services
        "APN",
        "APNSearch",
        "APNLookup",
        "Parcel",
        "ParcelInfo"
    ]
    
    try:
        client = Client("https://www.titlepoint.com/TitlePointServices/TpsService.asmx?WSDL")
        
        user_id = "PCTXML01"
        password = "AlphaOmega637#"
        address = "1358 5th St"
        city = "La Verne" 
        state = "CA"
        county = "Los Angeles"
        zip_code = "91750"
        
        successful_services = []
        failed_services = []
        
        print(f"🏠 Test Property: {address}, {city}, {state} {zip_code}")
        print(f"🔑 Testing {len(common_service_types)} service types...")
        
        for i, service_type in enumerate(common_service_types, 1):
            try:
                print(f"\n({i:2d}/{len(common_service_types)}) 🧪 Testing: {service_type}")
                
                response = client.service.CreateService(
                    userID=user_id,
                    password=password,
                    company="",
                    department="",
                    titleUnit="",
                    orderNo="",
                    customerRef="",
                    serviceType=service_type,
                    streetAddr=address,
                    streetAddr2="",
                    city=city,
                    state=state,
                    zip=zip_code,
                    county=county,
                    apn="",
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
                
                status = response.ReturnStatus
                
                if status == "Success":
                    request_id = getattr(response, 'RequestID', 'Unknown')
                    print(f"     ✅ SUCCESS! Service: {service_type}, Request ID: {request_id}")
                    successful_services.append({
                        'service_type': service_type,
                        'request_id': request_id,
                        'response': response
                    })
                    
                    # If we find a working service, we can stop and use it
                    if len(successful_services) >= 3:  # Get a few working services
                        print(f"\n🎉 Found multiple working services - continuing to find more...")
                        
                elif "does not correspond to an available service" in str(response):
                    print(f"     ❌ Not available: {service_type}")
                    failed_services.append(service_type)
                else:
                    print(f"     ⚠️ Failed but available: {service_type} - {status}")
                    # This means the service exists but failed for other reasons
                    successful_services.append({
                        'service_type': service_type,
                        'status': status,
                        'response': response
                    })
                    
            except Exception as e:
                error_msg = str(e)
                if "does not correspond to an available service" in error_msg:
                    print(f"     ❌ Not available: {service_type}")
                else:
                    print(f"     💥 Error: {service_type} - {error_msg[:100]}...")
                failed_services.append(service_type)
        
        # Results summary
        print(f"\n📊 RESULTS SUMMARY")
        print("=" * 40)
        print(f"✅ Working services found: {len(successful_services)}")
        print(f"❌ Non-available services: {len(failed_services)}")
        
        if successful_services:
            print(f"\n🎉 WORKING SERVICE TYPES:")
            for service in successful_services:
                service_type = service['service_type']
                request_id = service.get('request_id', 'N/A')
                status = service.get('status', 'Success')
                print(f"   • {service_type} (ID: {request_id}, Status: {status})")
            
            # Return the first successful service for further testing
            return successful_services[0]
        else:
            print(f"\n⚠️ No working service types found")
            print(f"💡 Recommendation: Contact TitlePoint support at 877.744.3375")
            return None
            
    except Exception as e:
        print(f"❌ Test failed: {str(e)}")
        return None

def test_working_service(service_info):
    """Test retrieving results from a working service"""
    if not service_info:
        return
        
    print(f"\n🔍 TESTING RESULT RETRIEVAL")
    print("=" * 40)
    
    try:
        client = Client("https://www.titlepoint.com/TitlePointServices/TpsService.asmx?WSDL")
        
        service_type = service_info['service_type']
        request_id = service_info.get('request_id')
        
        if not request_id:
            print(f"❌ No request ID available for {service_type}")
            return
            
        print(f"🔍 Getting results for service: {service_type}")
        print(f"📋 Request ID: {request_id}")
        
        # Try to get the result
        response = client.service.GetResultByRequestID(
            userID="PCTXML01",
            password="AlphaOmega637#",
            requestID=request_id
        )
        
        print(f"📄 Result Status: {response.ReturnStatus}")
        
        if response.ReturnStatus == "Success":
            print(f"🎉 RESULT RETRIEVAL SUCCESS!")
            print(f"📊 Result data available")
            
            # Print any result data
            if hasattr(response, 'ResultData') and response.ResultData:
                print(f"📋 Result Data: {str(response.ResultData)[:500]}...")
            
        else:
            print(f"⚠️ Result not ready yet or failed")
            if hasattr(response, 'ReturnErrors'):
                print(f"❌ Errors: {response.ReturnErrors}")
                
    except Exception as e:
        print(f"❌ Result retrieval error: {str(e)}")

if __name__ == "__main__":
    print("🧪 COMPREHENSIVE TITLEPOINT SERVICE TYPE TEST")
    print("=" * 60)
    print("🎯 Goal: Find working service types for property data")
    print("📍 Test Address: 1358 5th St. La Verne, CA 91750")
    print("=" * 60)
    
    # Test common service types
    working_service = test_common_service_types()
    
    # If we found a working service, test result retrieval
    if working_service:
        test_working_service(working_service)
        
        print(f"\n🎯 RECOMMENDATION:")
        print(f"Use service type: '{working_service['service_type']}'")
        print(f"Update your TitlePoint integration to use this service type")
    else:
        print(f"\n📞 CONTACT TITLEPOINT SUPPORT:")
        print(f"Phone: 877.744.3375")
        print(f"Ask about available service types for account: PCTXML01")

