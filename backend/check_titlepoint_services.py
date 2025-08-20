#!/usr/bin/env python3
"""
Check available TitlePoint services
"""
import os
import sys
from zeep import Client

def check_available_services():
    """Check what services are actually available in TitlePoint"""
    print("🔍 CHECKING AVAILABLE TITLEPOINT SERVICES")
    print("=" * 50)
    
    try:
        # Initialize SOAP client
        wsdl_url = "https://www.titlepoint.com/TitlePointServices/TpsService.asmx?WSDL"
        client = Client(wsdl_url)
        
        print(f"✅ SOAP Client initialized")
        
        # Test credentials
        user_id = "PCTXML01"
        password = "AlphaOmega637#"
        state = "CA"
        county = "Los Angeles"
        
        # Common TitlePoint service types to test
        service_types_to_test = [
            "TitlePoint.Geo.LegalVesting",
            "TitlePoint.Geo.DeedHistory", 
            "TitlePoint.Geo.PropertyProfile",
            "TitlePoint.Geo.TaxInfo",
            "TitlePoint.Geo.Ownership",
            "PropertyProfile",
            "DeedHistory",
            "LegalVesting",
            "TaxInfo",
            "Ownership",
            "Geo.PropertyProfile",
            "Geo.DeedHistory",
            "Geo.LegalVesting"
        ]
        
        print(f"🧪 Testing {len(service_types_to_test)} potential service types...")
        
        available_services = []
        failed_services = []
        
        for service_type in service_types_to_test:
            try:
                print(f"\n🔍 Testing: {service_type}")
                
                response = client.service.CreateService3(
                    userID=user_id,
                    password=password,
                    state=state,
                    county=county,
                    parameters=f"FullAddress=1358 5th St. La Verne, CA 91750",
                    serviceType=service_type
                )
                
                status = response.ReturnStatus
                
                if status == 'Success':
                    print(f"   ✅ SUCCESS: {service_type}")
                    available_services.append(service_type)
                elif status == 'Failed':
                    errors = response.ReturnErrors
                    if errors and 'ReturnError' in errors:
                        error_list = errors['ReturnError']
                        if isinstance(error_list, list):
                            for error in error_list:
                                error_desc = error.get('ErrorDescription', 'Unknown error')
                                if 'does not correspond to an available service' in error_desc:
                                    print(f"   ❌ NOT AVAILABLE: {service_type}")
                                else:
                                    print(f"   ⚠️ AVAILABLE BUT FAILED: {service_type} - {error_desc}")
                                    available_services.append(f"{service_type} (available but failed)")
                        else:
                            error_desc = error_list.get('ErrorDescription', 'Unknown error')
                            if 'does not correspond to an available service' in error_desc:
                                print(f"   ❌ NOT AVAILABLE: {service_type}")
                            else:
                                print(f"   ⚠️ AVAILABLE BUT FAILED: {service_type} - {error_desc}")
                                available_services.append(f"{service_type} (available but failed)")
                    failed_services.append(service_type)
                else:
                    print(f"   ❓ UNKNOWN STATUS: {service_type} - {status}")
                    
            except Exception as e:
                print(f"   💥 EXCEPTION: {service_type} - {str(e)}")
                failed_services.append(service_type)
        
        # Summary
        print(f"\n📊 SUMMARY")
        print("=" * 30)
        print(f"✅ Available services: {len(available_services)}")
        for service in available_services:
            print(f"   • {service}")
        
        print(f"\n❌ Unavailable/Failed services: {len(failed_services)}")
        for service in failed_services[:5]:  # Show first 5
            print(f"   • {service}")
        if len(failed_services) > 5:
            print(f"   ... and {len(failed_services) - 5} more")
            
        return available_services
        
    except Exception as e:
        print(f"❌ Error checking services: {str(e)}")
        return []

if __name__ == "__main__":
    check_available_services()

