#!/usr/bin/env python3
"""
Test script for Google Places and TitlePoint API integration
Test address: 1358 5th St. La Verne, CA 91750
"""
import asyncio
import json
import os
import sys
from typing import Dict, Any

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.google_places_service import GooglePlacesService
from services.titlepoint_service import TitlePointService

class PropertyIntegrationTester:
    """Test both Google Places and TitlePoint integrations"""
    
    def __init__(self):
        self.test_address = "1358 5th St. La Verne, CA 91750"
        self.results = {}
    
    async def test_google_places_validation(self) -> Dict[str, Any]:
        """Test Google Places API validation"""
        print("🔍 TESTING GOOGLE PLACES API VALIDATION")
        print("=" * 50)
        
        try:
            # Initialize Google Places service
            google_service = GooglePlacesService()
            print(f"✅ Google Places service initialized")
            
            # Test data structure matching frontend format
            address_data = {
                "fullAddress": self.test_address,
                "street": "1358 5th St",
                "city": "La Verne", 
                "state": "CA",
                "zip": "91750"
            }
            
            print(f"📍 Testing address: {self.test_address}")
            print(f"📋 Input data: {json.dumps(address_data, indent=2)}")
            
            # Call Google Places validation
            result = await google_service.validate_address(address_data)
            
            print(f"✅ Google Places validation SUCCESS")
            print(f"📊 Result data: {json.dumps(result, indent=2)}")
            
            # Store results for TitlePoint test
            self.results['google_places'] = {
                'success': True,
                'data': result,
                'formatted_address': result.get('formatted_address', ''),
                'place_id': result.get('google_place_id', ''),
                'city': result.get('city', ''),
                'county': result.get('county', ''),
                'state': result.get('state', ''),
                'zip_code': result.get('zip_code', '')
            }
            
            return self.results['google_places']
            
        except Exception as e:
            error_result = {
                'success': False,
                'error': str(e),
                'message': f"Google Places validation failed: {str(e)}"
            }
            
            print(f"❌ Google Places validation FAILED: {str(e)}")
            self.results['google_places'] = error_result
            return error_result
    
    async def test_titlepoint_api_call(self, google_data: Dict = None) -> Dict[str, Any]:
        """Test TitlePoint API call using validated address data"""
        print("\n🏛️ TESTING TITLEPOINT API CALL")
        print("=" * 50)
        
        try:
            # Initialize TitlePoint service
            titlepoint_service = TitlePointService()
            print(f"✅ TitlePoint service initialized")
            
            # Prepare data for TitlePoint (use Google results if available)
            if google_data and google_data.get('success'):
                # Use enriched data from Google Places
                titlepoint_data = {
                    "fullAddress": google_data['data'].get('formatted_address', self.test_address),
                    "street": google_data['data'].get('street_address', '1358 5th St'),
                    "city": google_data['data'].get('city', 'La Verne'),
                    "county": google_data['data'].get('county', 'Los Angeles'),
                    "state": google_data['data'].get('state', 'CA'),
                    "zip": google_data['data'].get('zip_code', '91750')
                }
            else:
                # Use basic test data
                titlepoint_data = {
                    "fullAddress": self.test_address,
                    "street": "1358 5th St",
                    "city": "La Verne",
                    "county": "Los Angeles",
                    "state": "CA", 
                    "zip": "91750"
                }
            
            print(f"📍 TitlePoint input: {json.dumps(titlepoint_data, indent=2)}")
            
            # Call TitlePoint enrichment
            result = await titlepoint_service.enrich_property(titlepoint_data)
            
            if result.get('success'):
                print(f"✅ TitlePoint API call SUCCESS")
                print(f"📊 TitlePoint data retrieved:")
                print(f"   🏠 APN: {result.get('apn', 'Not found')}")
                print(f"   📋 Brief Legal: {result.get('brief_legal', 'Not found')}")
                print(f"   👤 Primary Owner: {result.get('current_owner_primary', 'Not found')}")
                print(f"   👥 Secondary Owner: {result.get('current_owner_secondary', 'Not found')}")
            else:
                print(f"⚠️ TitlePoint API call completed but no data found")
                print(f"📄 Message: {result.get('message', 'No message')}")
            
            print(f"🔍 Full TitlePoint result: {json.dumps(result, indent=2)}")
            
            self.results['titlepoint'] = result
            return result
            
        except Exception as e:
            error_result = {
                'success': False,
                'error': str(e),
                'message': f"TitlePoint API call failed: {str(e)}"
            }
            
            print(f"❌ TitlePoint API call FAILED: {str(e)}")
            self.results['titlepoint'] = error_result
            return error_result
    
    async def test_full_integration_flow(self) -> Dict[str, Any]:
        """Test the complete integration flow: Google Places → TitlePoint"""
        print("🚀 TESTING FULL INTEGRATION FLOW")
        print("=" * 60)
        print(f"🎯 Test Address: {self.test_address}")
        print("=" * 60)
        
        # Step 1: Google Places validation
        google_result = await self.test_google_places_validation()
        
        # Step 2: TitlePoint enrichment (using Google data if successful)
        titlepoint_result = await self.test_titlepoint_api_call(google_result)
        
        # Step 3: Analyze integration results
        print("\n📈 INTEGRATION FLOW ANALYSIS")
        print("=" * 50)
        
        flow_success = (
            google_result.get('success', False) and 
            titlepoint_result.get('success', False)
        )
        
        integration_result = {
            'flow_success': flow_success,
            'google_places': google_result,
            'titlepoint': titlepoint_result,
            'test_address': self.test_address,
            'analysis': self._analyze_integration_results(google_result, titlepoint_result)
        }
        
        if flow_success:
            print("✅ FULL INTEGRATION FLOW: SUCCESS")
            print("🎉 Both Google Places validation and TitlePoint enrichment worked!")
        else:
            print("❌ FULL INTEGRATION FLOW: PARTIAL OR FAILED")
            if not google_result.get('success'):
                print("   ⚠️ Google Places validation failed")
            if not titlepoint_result.get('success'):
                print("   ⚠️ TitlePoint API call failed")
        
        return integration_result
    
    def _analyze_integration_results(self, google_result: Dict, titlepoint_result: Dict) -> Dict:
        """Analyze the integration test results"""
        analysis = {
            'google_places_status': 'success' if google_result.get('success') else 'failed',
            'titlepoint_status': 'success' if titlepoint_result.get('success') else 'failed',
            'data_quality': {},
            'recommendations': []
        }
        
        # Analyze Google Places data quality
        if google_result.get('success'):
            google_data = google_result.get('data', {})
            analysis['data_quality']['google'] = {
                'has_formatted_address': bool(google_data.get('formatted_address')),
                'has_place_id': bool(google_data.get('google_place_id')),
                'has_coordinates': bool(google_data.get('latitude') and google_data.get('longitude')),
                'has_county': bool(google_data.get('county')),
                'has_zip': bool(google_data.get('zip_code'))
            }
        
        # Analyze TitlePoint data quality
        if titlepoint_result.get('success'):
            analysis['data_quality']['titlepoint'] = {
                'has_apn': bool(titlepoint_result.get('apn')),
                'has_legal_description': bool(titlepoint_result.get('brief_legal')),
                'has_primary_owner': bool(titlepoint_result.get('current_owner_primary')),
                'has_secondary_owner': bool(titlepoint_result.get('current_owner_secondary'))
            }
        
        # Generate recommendations
        if not google_result.get('success'):
            analysis['recommendations'].append("Check Google Places API key and quota")
        
        if not titlepoint_result.get('success'):
            analysis['recommendations'].append("Check TitlePoint credentials and service availability")
        
        if google_result.get('success') and not titlepoint_result.get('success'):
            analysis['recommendations'].append("Google validation works - focus on TitlePoint integration")
        
        return analysis
    
    def print_summary_report(self, results: Dict):
        """Print a comprehensive summary report"""
        print("\n" + "=" * 80)
        print("📋 PROPERTY INTEGRATION TEST SUMMARY REPORT")
        print("=" * 80)
        
        print(f"🎯 Test Address: {self.test_address}")
        print(f"📅 Test Date: {asyncio.get_event_loop().time()}")
        
        # Google Places Summary
        print("\n🔍 GOOGLE PLACES API TEST:")
        google_status = "✅ SUCCESS" if results['google_places']['success'] else "❌ FAILED"
        print(f"   Status: {google_status}")
        
        if results['google_places']['success']:
            data = results['google_places']['data']
            print(f"   📍 Formatted Address: {data.get('formatted_address', 'N/A')}")
            print(f"   🆔 Place ID: {data.get('google_place_id', 'N/A')}")
            print(f"   📍 Coordinates: {data.get('latitude', 'N/A')}, {data.get('longitude', 'N/A')}")
            print(f"   🏛️ County: {data.get('county', 'N/A')}")
        else:
            print(f"   ❌ Error: {results['google_places'].get('error', 'Unknown error')}")
        
        # TitlePoint Summary
        print("\n🏛️ TITLEPOINT API TEST:")
        titlepoint_status = "✅ SUCCESS" if results['titlepoint']['success'] else "❌ FAILED"
        print(f"   Status: {titlepoint_status}")
        
        if results['titlepoint']['success']:
            print(f"   🏠 APN: {results['titlepoint'].get('apn', 'Not found')}")
            print(f"   📋 Brief Legal: {results['titlepoint'].get('brief_legal', 'Not found')}")
            print(f"   👤 Primary Owner: {results['titlepoint'].get('current_owner_primary', 'Not found')}")
            print(f"   👥 Secondary Owner: {results['titlepoint'].get('current_owner_secondary', 'Not found')}")
        else:
            print(f"   ❌ Error: {results['titlepoint'].get('message', 'Unknown error')}")
        
        # Overall Assessment
        print(f"\n🎯 OVERALL INTEGRATION ASSESSMENT:")
        if results['flow_success']:
            print("   ✅ EXCELLENT: Both APIs working perfectly!")
            print("   🚀 Ready for production deed generation workflow")
        else:
            print("   ⚠️ NEEDS ATTENTION: One or both APIs need troubleshooting")
            
            # Specific recommendations
            analysis = results.get('analysis', {})
            recommendations = analysis.get('recommendations', [])
            if recommendations:
                print("   📝 Recommendations:")
                for rec in recommendations:
                    print(f"      • {rec}")
        
        print("=" * 80)

async def main():
    """Main test execution"""
    print("🧪 PROPERTY INTEGRATION TEST SUITE")
    print("Testing Google Places + TitlePoint integration")
    print(f"Target Address: 1358 5th St. La Verne, CA 91750")
    print("=" * 80)
    
    # Check environment variables
    print("🔧 CHECKING ENVIRONMENT SETUP:")
    google_key = os.getenv("GOOGLE_API_KEY")
    titlepoint_user = os.getenv("TITLEPOINT_USER_ID", "PCTXML01") 
    titlepoint_pass = os.getenv("TITLEPOINT_PASSWORD", "AlphaOmega637#")
    
    print(f"   Google API Key: {'✅ Set' if google_key else '❌ Missing'}")
    print(f"   TitlePoint User: {'✅ Set' if titlepoint_user else '❌ Missing'} ({titlepoint_user})")
    print(f"   TitlePoint Pass: {'✅ Set' if titlepoint_pass else '❌ Missing'}")
    
    if not google_key:
        print("❌ GOOGLE_API_KEY environment variable is required")
        print("💡 Set it in your environment or .env file")
        return
    
    # Run tests
    tester = PropertyIntegrationTester()
    results = await tester.test_full_integration_flow()
    
    # Print detailed summary
    tester.print_summary_report(results)
    
    # Save results to file for review
    with open('property_integration_test_results.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"\n💾 Detailed results saved to: property_integration_test_results.json")

if __name__ == "__main__":
    asyncio.run(main())
