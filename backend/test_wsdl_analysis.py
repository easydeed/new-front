#!/usr/bin/env python3
"""
Analyze TitlePoint WSDL to understand the correct CreateService3 parameters
"""
import asyncio
import httpx
from xml.etree import ElementTree as ET

async def analyze_titlepoint_wsdl():
    """Download and analyze TitlePoint WSDL to understand parameters"""
    
    print("🧪 Analyzing TitlePoint WSDL for CreateService3 parameters")
    print("=" * 60)
    
    wsdl_url = "https://www.titlepoint.com/TitlePointServices/TpsService.asmx?WSDL"
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(wsdl_url)
            
            if response.status_code == 200:
                print(f"✅ WSDL downloaded successfully ({len(response.text)} bytes)")
                
                # Parse WSDL XML
                root = ET.fromstring(response.text)
                
                # Look for CreateService3 operation
                print("\n🔍 Searching for CreateService3 operation...")
                
                # Find all operations
                operations = []
                for elem in root.iter():
                    if 'operation' in elem.tag.lower() and elem.get('name'):
                        operations.append(elem.get('name'))
                
                print(f"📋 Found {len(set(operations))} operations: {sorted(set(operations))}")
                
                # Look specifically for CreateService3
                for elem in root.iter():
                    if 'CreateService3' in str(elem.tag) or 'CreateService3' in str(elem.text):
                        print(f"\n🎯 Found CreateService3 reference:")
                        print(f"   Tag: {elem.tag}")
                        print(f"   Attributes: {elem.attrib}")
                        print(f"   Text: {elem.text}")
                        
                        # Look at parent and children
                        if elem.getparent() is not None:
                            print(f"   Parent: {elem.getparent().tag}")
                        for child in elem:
                            print(f"   Child: {child.tag} = {child.text}")
                
                # Look for message definitions that might contain parameters
                print("\n🔍 Searching for CreateService3 message definitions...")
                namespaces = {
                    'wsdl': 'http://schemas.xmlsoap.org/wsdl/',
                    's': 'http://www.w3.org/2001/XMLSchema',
                    'soap': 'http://schemas.xmlsoap.org/wsdl/soap/',
                    'soap12': 'http://schemas.xmlsoap.org/wsdl/soap12/'
                }
                
                # Find CreateService3 operation definition
                for operation in root.findall('.//wsdl:operation[@name="CreateService3"]', namespaces):
                    print(f"\n📋 CreateService3 Operation Details:")
                    print(f"   Operation: {operation.attrib}")
                    
                    # Find input/output messages
                    for child in operation:
                        print(f"   {child.tag}: {child.attrib}")
                
                # Find message definitions
                for message in root.findall('.//wsdl:message', namespaces):
                    msg_name = message.get('name', '')
                    if 'CreateService3' in msg_name:
                        print(f"\n📨 Message: {msg_name}")
                        for part in message.findall('.//wsdl:part', namespaces):
                            print(f"   Parameter: {part.get('name')} (type: {part.get('type', part.get('element', 'unknown'))})")
                
                # Look for complex types that might define the parameters
                for complexType in root.findall('.//s:complexType', namespaces):
                    type_name = complexType.get('name', '')
                    if 'CreateService3' in type_name:
                        print(f"\n🏗️  ComplexType: {type_name}")
                        for element in complexType.findall('.//s:element', namespaces):
                            print(f"   Element: {element.get('name')} (type: {element.get('type', 'unknown')})")
                
            else:
                print(f"❌ Failed to download WSDL: HTTP {response.status_code}")
                
    except Exception as e:
        print(f"❌ Error analyzing WSDL: {e}")

if __name__ == "__main__":
    asyncio.run(analyze_titlepoint_wsdl())
