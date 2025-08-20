#!/usr/bin/env python3
"""
Debug TitlePoint SOAP response structure
"""
import os
import sys
from zeep import Client

def debug_titlepoint_soap():
    """Debug the actual SOAP response structure"""
    print("🔍 DEBUGGING TITLEPOINT SOAP RESPONSE STRUCTURE")
    print("=" * 60)
    
    try:
        # Initialize SOAP client
        wsdl_url = "https://www.titlepoint.com/TitlePointServices/TpsService.asmx?WSDL"
        client = Client(wsdl_url)
        
        print(f"✅ SOAP Client initialized")
        print(f"🌐 WSDL URL: {wsdl_url}")
        
        # Test credentials
        user_id = "PCTXML01"
        password = "AlphaOmega637#"
        
        print(f"🔑 Using credentials: {user_id} / {password}")
        
        # Test parameters
        state = "CA"
        county = "Los Angeles"
        service_type = "TitlePoint.Geo.LegalVesting"
        parameters = "LegalVesting.FullAddress=1358 5th St. La Verne, CA 91750"
        
        print(f"📋 Test parameters:")
        print(f"   State: {state}")
        print(f"   County: {county}")
        print(f"   Service Type: {service_type}")
        print(f"   Parameters: {parameters}")
        
        # Make the SOAP call
        print(f"\n🚀 Making SOAP call...")
        response = client.service.CreateService3(
            userID=user_id,
            password=password,
            state=state,
            county=county,
            parameters=parameters,
            serviceType=service_type
        )
        
        print(f"✅ SOAP call completed")
        print(f"📊 Response type: {type(response)}")
        print(f"📋 Response attributes: {dir(response)}")
        
        # Try to access different possible attributes
        possible_attrs = ['ReturnStatus', 'Status', 'Message', 'ErrorMessage', 'RequestID', 'Id']
        
        print(f"\n🔍 Checking response attributes:")
        for attr in possible_attrs:
            if hasattr(response, attr):
                value = getattr(response, attr)
                print(f"   ✅ {attr}: {value}")
            else:
                print(f"   ❌ {attr}: Not found")
        
        # If response has __dict__, print it
        if hasattr(response, '__dict__'):
            print(f"\n📖 Response __dict__:")
            for key, value in response.__dict__.items():
                print(f"   {key}: {value}")
        
        # If response has __getstate__, try that
        if hasattr(response, '__getstate__'):
            print(f"\n📖 Response __getstate__:")
            try:
                state_data = response.__getstate__()
                print(f"   {state_data}")
            except Exception as e:
                print(f"   Error getting state: {e}")
        
        # Try to convert to string representation
        print(f"\n📄 Response string representation:")
        print(f"   {str(response)}")
        
        return response
        
    except Exception as e:
        print(f"❌ SOAP call failed: {str(e)}")
        print(f"🔍 Error type: {type(e)}")
        return None

if __name__ == "__main__":
    debug_titlepoint_soap()

