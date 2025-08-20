#!/usr/bin/env python3
"""
Test what data we can get from the working TitlePoint.Geo.Property service
to see if it includes legal vesting information
"""
from zeep import Client
import time

def test_property_service_for_vesting():
    """Test if TitlePoint.Geo.Property provides legal vesting information"""
    print("🔍 TESTING TITLEPOINT.GEO.PROPERTY FOR LEGAL VESTING DATA")
    print("=" * 65)
    print("🎯 Goal: Check if Property service includes vesting/ownership info")
    print("📍 Test Address: 1358 5th St. La Verne, CA 91750")
    print("=" * 65)
    
    try:
        client = Client("https://www.titlepoint.com/TitlePointServices/TpsService.asmx?WSDL")
        
        # Create the service request
        print("🚀 Step 1: Creating TitlePoint.Geo.Property service...")
        
        response = client.service.CreateService3(
            userID="PCTXML01",
            password="AlphaOmega637#",
            state="CA",
            county="Los Angeles",
            serviceType="TitlePoint.Geo.Property",
            parameters="Property.FullAddress=1358 5th St. La Verne, CA 91750"
        )
        
        if response.ReturnStatus != "Success":
            print(f"❌ Service creation failed: {response.ReturnStatus}")
            return
            
        request_id = response.RequestID
        print(f"✅ Service created successfully! Request ID: {request_id}")
        
        # Wait a moment for processing
        print(f"⏳ Waiting 15 seconds for TitlePoint processing...")
        time.sleep(15)
        
        # Try to get results
        print(f"📊 Step 2: Retrieving results...")
        
        result_response = client.service.GetResultByRequestID(
            userID="PCTXML01",
            password="AlphaOmega637#",
            company="",
            department="",
            titleOfficer="",
            requestId=int(request_id),
            maxWaitSeconds=30
        )
        
        print(f"📄 Result Status: {result_response.ReturnStatus}")
        
        if result_response.ReturnStatus == "Success":
            print(f"🎉 SUCCESS! Got property data from TitlePoint!")
            
            # Check what data we received
            if hasattr(result_response, 'ResultData') and result_response.ResultData:
                result_data = str(result_response.ResultData)
                print(f"\n📋 Result Data Length: {len(result_data)} characters")
                
                # Look for vesting/ownership keywords
                vesting_keywords = [
                    'owner', 'vesting', 'legal', 'deed', 'grantor', 'grantee',
                    'property', 'title', 'ownership', 'tenant', 'joint'
                ]
                
                found_keywords = []
                for keyword in vesting_keywords:
                    if keyword.lower() in result_data.lower():
                        found_keywords.append(keyword)
                
                print(f"🔍 Vesting-related keywords found: {found_keywords}")
                
                # Show first 500 characters of result
                preview = result_data[:500] + "..." if len(result_data) > 500 else result_data
                print(f"\n📄 Data Preview (first 500 chars):")
                print(f"   {preview}")
                
                # Look specifically for legal/vesting sections
                if any(keyword in result_data.lower() for keyword in ['vesting', 'owner', 'legal']):
                    print(f"\n✅ GOOD NEWS: Property service appears to include vesting/ownership data!")
                    return True
                else:
                    print(f"\n⚠️ Property service may not include detailed vesting information")
                    return False
                    
            else:
                print(f"❌ No result data returned")
                return False
                
        elif "pending" in result_response.ReturnStatus.lower() or "processing" in result_response.ReturnStatus.lower():
            print(f"⏳ Results still processing - may need longer wait time")
            return None
        else:
            print(f"❌ Result retrieval failed: {result_response.ReturnStatus}")
            if hasattr(result_response, 'ReturnErrors'):
                print(f"   Errors: {result_response.ReturnErrors}")
            return False
            
    except Exception as e:
        print(f"❌ Test failed: {str(e)}")
        return False

def test_alternative_services():
    """Test if other working services provide vesting data"""
    print(f"\n🔄 TESTING ALTERNATIVE SERVICES FOR VESTING DATA")
    print("=" * 55)
    
    alternative_services = [
        {
            'name': 'TitlePoint.Geo.Address',
            'parameters': 'Address.FullAddress=1358 5th St. La Verne, CA 91750'
        },
        {
            'name': 'TitlePoint.Geo.Tax', 
            'parameters': 'Tax.APN=8888-012-012;General.AutoSearchTaxes=true;General.AutoSearchProperty=false'
        }
    ]
    
    try:
        client = Client("https://www.titlepoint.com/TitlePointServices/TpsService.asmx?WSDL")
        
        for service in alternative_services:
            print(f"\n🧪 Testing: {service['name']}")
            
            response = client.service.CreateService3(
                userID="PCTXML01",
                password="AlphaOmega637#",
                state="CA",
                county="Los Angeles",
                serviceType=service['name'],
                parameters=service['parameters']
            )
            
            if response.ReturnStatus == "Success":
                print(f"   ✅ Service created: Request ID {response.RequestID}")
            else:
                print(f"   ❌ Failed: {response.ReturnStatus}")
                
    except Exception as e:
        print(f"❌ Alternative services test failed: {str(e)}")

if __name__ == "__main__":
    print("🎯 LEGAL VESTING DATA INVESTIGATION")
    print("=" * 50)
    print("📋 Checking if working TitlePoint services provide vesting information")
    print("=" * 50)
    
    # Test the Property service for vesting data
    has_vesting = test_property_service_for_vesting()
    
    # Test alternatives
    test_alternative_services()
    
    print(f"\n📊 SUMMARY")
    print("=" * 30)
    if has_vesting:
        print("✅ TitlePoint.Geo.Property appears to include vesting/ownership data")
        print("🎯 Recommendation: Use this service for legal vesting information")
    elif has_vesting is False:
        print("⚠️ Property service may not include detailed vesting data")
        print("📞 Recommendation: Contact TitlePoint support for vesting-specific service")
    else:
        print("⏳ Results still processing - try again with longer wait time")
        print("🔄 Or check TitlePoint.Geo.Address as alternative")
