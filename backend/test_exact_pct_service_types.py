#!/usr/bin/env python3
"""
Test the EXACT service types that Pacific Coast Title might be using
Based on the environment variable TAX_SEARCH_SERVICE_TYPE
"""
from zeep import Client

def test_tax_service_variations():
    """Test possible values for TAX_SEARCH_SERVICE_TYPE environment variable"""
    print("🔍 TESTING POSSIBLE TAX_SEARCH_SERVICE_TYPE VALUES")
    print("=" * 55)
    print("📋 Based on Pacific Coast Title environment variables")
    print("=" * 55)
    
    # Possible values for the TAX_SEARCH_SERVICE_TYPE environment variable
    tax_service_candidates = [
        # Most likely candidates based on our working services
        "TitlePoint.Geo.Tax",
        
        # Variations that might be used for tax search
        "TitlePoint.Tax",
        "Tax",
        "TaxSearch",
        "TitlePoint.Geo.TaxSearch",
        
        # Based on Pacific Coast Title pattern
        "TitlePoint.Geo.TaxInstrument",
        "TitlePoint.TaxInstrument",
        
        # Other possibilities
        "Geo.Tax",
        "TitlePoint.Instrument.Tax",
        "TitlePoint.Plant.Tax"
    ]
    
    try:
        client = Client("https://www.titlepoint.com/TitlePointServices/TpsService.asmx?WSDL")
        
        working_tax_services = []
        
        for service_type in tax_service_candidates:
            try:
                print(f"\n🧪 Testing: {service_type}")
                
                # Use the exact parameters from Pacific Coast Title docs
                parameters = "Tax.APN=8888-012-012;General.AutoSearchTaxes=true;General.AutoSearchProperty=false"
                
                response = client.service.CreateService3(
                    userID="PCTXML01",
                    password="AlphaOmega637#",
                    state="CA",
                    county="Los Angeles",
                    serviceType=service_type,
                    parameters=parameters
                )
                
                status = response.ReturnStatus
                print(f"   📄 Status: {status}")
                
                if status == "Success":
                    request_id = getattr(response, 'RequestID', 'Unknown')
                    print(f"   ✅ SUCCESS! Request ID: {request_id}")
                    working_tax_services.append({
                        'service_type': service_type,
                        'request_id': request_id,
                        'parameters': parameters
                    })
                else:
                    print(f"   ❌ Failed: {status}")
                    if hasattr(response, 'ReturnErrors') and response.ReturnErrors:
                        errors = response.ReturnErrors
                        if hasattr(errors, 'ReturnError'):
                            error_list = errors.ReturnError
                            if isinstance(error_list, list):
                                for error in error_list:
                                    if hasattr(error, 'ErrorDescription'):
                                        if "does not correspond to an available service" in error.ErrorDescription:
                                            print(f"      ❌ Not available")
                                        else:
                                            print(f"      ⚠️ Available but failed: {error.ErrorDescription}")
                            
            except Exception as e:
                print(f"   💥 Exception: {str(e)}")
        
        return working_tax_services
        
    except Exception as e:
        print(f"❌ Test failed: {str(e)}")
        return []

def test_legal_vesting_alternatives():
    """Test alternative service types for legal vesting information"""
    print(f"\n🔍 TESTING LEGAL VESTING ALTERNATIVES")
    print("=" * 45)
    
    # Alternative service types for legal/vesting information
    vesting_candidates = [
        # We know this one fails, but let's confirm
        "TitlePoint.Geo.LegalVesting",
        
        # Alternatives that might provide vesting info
        "TitlePoint.Geo.Legal",
        "TitlePoint.Legal",
        "Legal",
        "LegalVesting",
        "Vesting",
        "TitlePoint.Geo.Vesting",
        "TitlePoint.Vesting",
        
        # Document-based alternatives
        "TitlePoint.Geo.Deed",
        "TitlePoint.Deed",
        "Deed",
        
        # Owner-based alternatives
        "TitlePoint.Geo.Owner",
        "TitlePoint.Owner",
        "Owner",
        "Ownership"
    ]
    
    try:
        client = Client("https://www.titlepoint.com/TitlePointServices/TpsService.asmx?WSDL")
        
        working_vesting_services = []
        
        for service_type in vesting_candidates:
            try:
                print(f"\n🧪 Testing: {service_type}")
                
                # Use the exact parameters from Pacific Coast Title docs
                parameters = "LegalVesting.FIPS=06037;LegalVesting.FullAddress=1358 5th St. La Verne, CA 91750"
                
                response = client.service.CreateService3(
                    userID="PCTXML01",
                    password="AlphaOmega637#",
                    state="CA",
                    county="Los Angeles",
                    serviceType=service_type,
                    parameters=parameters
                )
                
                status = response.ReturnStatus
                print(f"   📄 Status: {status}")
                
                if status == "Success":
                    request_id = getattr(response, 'RequestID', 'Unknown')
                    print(f"   ✅ SUCCESS! Request ID: {request_id}")
                    working_vesting_services.append({
                        'service_type': service_type,
                        'request_id': request_id,
                        'parameters': parameters
                    })
                else:
                    print(f"   ❌ Failed: {status}")
                    
            except Exception as e:
                print(f"   💥 Exception: {str(e)}")
        
        return working_vesting_services
        
    except Exception as e:
        print(f"❌ Test failed: {str(e)}")
        return []

if __name__ == "__main__":
    print("🎯 EXACT PACIFIC COAST TITLE SERVICE TYPE VERIFICATION")
    print("=" * 65)
    print("📍 Goal: Find the exact service types Pacific Coast Title uses")
    print("📍 Test Address: 1358 5th St. La Verne, CA 91750")
    print("=" * 65)
    
    # Test tax service variations
    working_tax = test_tax_service_variations()
    
    # Test legal vesting alternatives
    working_vesting = test_legal_vesting_alternatives()
    
    # Summary
    print(f"\n📊 RESULTS SUMMARY")
    print("=" * 40)
    print(f"✅ Working tax services: {len(working_tax)}")
    for service in working_tax:
        print(f"   • {service['service_type']}")
    
    print(f"✅ Working vesting services: {len(working_vesting)}")
    for service in working_vesting:
        print(f"   • {service['service_type']}")
    
    if working_tax or working_vesting:
        print(f"\n🎯 RECOMMENDATION:")
        if working_tax:
            print(f"For TAX_SEARCH_SERVICE_TYPE environment variable, use: '{working_tax[0]['service_type']}'")
        if working_vesting:
            print(f"For legal vesting, use: '{working_vesting[0]['service_type']}'")
    else:
        print(f"\n⚠️ Need to investigate Pacific Coast Title's exact configuration")
