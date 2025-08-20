#!/usr/bin/env python3
"""
Test script for Pacific Coast Title's TitlePoint HTTP integration method
Testing against production API with the test address: 1358 5th St. La Verne, CA 91750
"""
import asyncio
import sys
import os

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.titlepoint_service import TitlePointService


async def test_pacific_coast_titlepoint():
    """Test TitlePoint API using Pacific Coast Title's proven HTTP method"""
    
    print("🧪 Testing TitlePoint API with Pacific Coast Title's HTTP method")
    print("=" * 70)
    
    # Test data - the address specified by the user
    test_data = {
        'fullAddress': '1358 5th St. La Verne, CA 91750',
        'street': '1358 5th St',
        'city': 'La Verne',
        'state': 'CA',
        'county': 'Los Angeles',  # Ensure county is provided
        'zip': '91750'
    }
    
    print(f"🏠 Test Address: {test_data['fullAddress']}")
    print(f"🗺️  County: {test_data['county']}")
    print(f"🏢 State: {test_data['state']}")
    print()
    
    try:
        # Initialize TitlePoint service
        print("🔧 Initializing TitlePoint service...")
        titlepoint_service = TitlePointService()
        print("✅ TitlePoint service initialized successfully")
        
        # Test the property enrichment
        print("\n🔍 Starting property enrichment...")
        print("-" * 50)
        
        result = await titlepoint_service.enrich_property(test_data)
        
        print("\n📊 RESULTS:")
        print("=" * 30)
        
        if result.get('success'):
            print("✅ SUCCESS! Property data retrieved")
            print(f"📋 APN: {result.get('apn', 'N/A')}")
            print(f"📜 Legal Description: {result.get('brief_legal', 'N/A')}")
            print(f"👤 Primary Owner: {result.get('current_owner_primary', 'N/A')}")
            print(f"👥 Secondary Owner: {result.get('current_owner_secondary', 'N/A')}")
            print(f"🏠 Address: {result.get('fullAddress', 'N/A')}")
            print(f"🗺️  County: {result.get('county', 'N/A')}")
            print(f"🏢 State: {result.get('state', 'N/A')}")
            print(f"📮 ZIP: {result.get('zip', 'N/A')}")
            
            if result.get('tax_year'):
                print(f"💰 Tax Year: {result.get('tax_year', 'N/A')}")
            if result.get('assessed_value'):
                print(f"💵 Assessed Value: {result.get('assessed_value', 'N/A')}")
            if result.get('property_type'):
                print(f"🏗️  Property Type: {result.get('property_type', 'N/A')}")
            
        else:
            print("❌ FAILED! Property data retrieval unsuccessful")
            print(f"💬 Message: {result.get('message', 'Unknown error')}")
            
            if result.get('debug_info'):
                print(f"🐛 Debug Info: {result['debug_info']}")
            
            if result.get('debug_xml'):
                print(f"📄 Debug XML Sample: {result['debug_xml'][:500]}...")
        
        print("\n" + "=" * 70)
        return result.get('success', False)
        
    except Exception as e:
        print(f"❌ CRITICAL ERROR: {str(e)}")
        print(f"🐛 Error Type: {type(e).__name__}")
        import traceback
        print(f"📋 Traceback:\n{traceback.format_exc()}")
        return False


async def main():
    """Main test function"""
    print("🚀 Starting Pacific Coast Title TitlePoint API Test")
    print("📍 Testing with address: 1358 5th St. La Verne, CA 91750")
    print()
    
    success = await test_pacific_coast_titlepoint()
    
    if success:
        print("\n🎉 TEST PASSED: TitlePoint integration working!")
        print("✅ Pacific Coast Title's HTTP method is functioning correctly")
    else:
        print("\n💥 TEST FAILED: TitlePoint integration has issues")
        print("❌ Need to investigate API call or response parsing")
    
    print("\n🏁 Test completed")


if __name__ == "__main__":
    asyncio.run(main())
