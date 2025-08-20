#!/usr/bin/env python3
"""
Inspect TitlePoint WSDL to understand available services and operations
"""
from zeep import Client
import xml.etree.ElementTree as ET
import requests

def inspect_titlepoint_wsdl():
    """Inspect the TitlePoint WSDL to understand available operations"""
    print("🔍 INSPECTING TITLEPOINT WSDL DOCUMENTATION")
    print("=" * 60)
    
    try:
        # Initialize SOAP client
        wsdl_url = "https://www.titlepoint.com/TitlePointServices/TpsService.asmx?WSDL"
        client = Client(wsdl_url)
        
        print(f"✅ SOAP Client initialized")
        print(f"🌐 WSDL URL: {wsdl_url}")
        
        # Print service information
        print(f"\n📋 SERVICE INFORMATION:")
        for service_name, service in client.wsdl.services.items():
            print(f"   Service: {service_name}")
            for port_name, port in service.ports.items():
                print(f"   Port: {port_name}")
                print(f"   Binding: {port.binding.name}")
        
        # Print available operations
        print(f"\n🔧 AVAILABLE OPERATIONS:")
        for operation_name, operation in client.wsdl.bindings[list(client.wsdl.bindings.keys())[0]].port_type.operations.items():
            print(f"   • {operation_name}")
            
            # Print operation parameters if available
            if hasattr(operation, 'input') and operation.input:
                print(f"     Input: {operation.input.signature()}")
            if hasattr(operation, 'output') and operation.output:
                print(f"     Output: {operation.output.signature()}")
        
        # Print types/schemas
        print(f"\n📚 AVAILABLE TYPES:")
        for type_name in client.wsdl.types:
            print(f"   • {type_name}")
        
        print(f"\n🔍 Let's examine CreateService3 operation specifically:")
        try:
            create_service = client.service.CreateService3
            print(f"   Operation: CreateService3")
            print(f"   Signature: {create_service.__doc__}")
        except Exception as e:
            print(f"   Error getting CreateService3 details: {e}")
        
        # Try to get the raw WSDL content for more details
        print(f"\n📄 EXAMINING RAW WSDL CONTENT...")
        response = requests.get(wsdl_url)
        if response.status_code == 200:
            # Parse XML to look for service type hints
            root = ET.fromstring(response.content)
            
            # Look for any documentation or comments about service types
            print(f"   Looking for service type documentation...")
            for elem in root.iter():
                if elem.text and ('service' in elem.text.lower() or 'type' in elem.text.lower()):
                    text = elem.text.strip()
                    if len(text) > 20 and len(text) < 200:  # Reasonable documentation length
                        print(f"   💡 Found: {text}")
        
        return client
        
    except Exception as e:
        print(f"❌ Error inspecting WSDL: {str(e)}")
        return None

def test_minimal_service():
    """Test with minimal service parameters to see what errors we get"""
    print(f"\n🧪 TESTING MINIMAL SERVICE CALL")
    print("=" * 50)
    
    try:
        client = Client("https://www.titlepoint.com/TitlePointServices/TpsService.asmx?WSDL")
        
        # Test with empty service type to see error message
        print(f"🔍 Testing with empty service type...")
        response = client.service.CreateService3(
            userID="PCTXML01",
            password="AlphaOmega637#",
            state="CA",
            county="Los Angeles",
            parameters="Address=1358 5th St La Verne CA 91750",
            serviceType=""  # Empty to see what error we get
        )
        
        print(f"Response: {response}")
        
    except Exception as e:
        print(f"Expected error with empty service type: {str(e)}")
        # This might give us hints about valid service types
        
    # Try some very basic service names
    basic_types = ["TitleSearch", "PropertySearch", "AddressSearch", "BasicSearch"]
    
    for service_type in basic_types:
        try:
            print(f"\n🧪 Testing: {service_type}")
            response = client.service.CreateService3(
                userID="PCTXML01",
                password="AlphaOmega637#",
                state="CA",
                county="Los Angeles",
                parameters="Address=1358 5th St La Verne CA 91750",
                serviceType=service_type
            )
            
            if response.ReturnStatus == "Success":
                print(f"   ✅ SUCCESS: {service_type} works!")
                return service_type
            else:
                print(f"   Status: {response.ReturnStatus}")
                if hasattr(response, 'ReturnErrors') and response.ReturnErrors:
                    errors = response.ReturnErrors
                    if hasattr(errors, 'ReturnError'):
                        error_list = errors.ReturnError
                        if isinstance(error_list, list):
                            for error in error_list:
                                if hasattr(error, 'ErrorDescription'):
                                    print(f"   Error: {error.ErrorDescription}")
        except Exception as e:
            print(f"   Exception: {str(e)}")

if __name__ == "__main__":
    client = inspect_titlepoint_wsdl()
    if client:
        test_minimal_service()

