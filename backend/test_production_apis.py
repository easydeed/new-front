#!/usr/bin/env python3
"""
Test production API endpoints for property integration
Tests against live Render backend with production environment variables
"""
import requests
import json
import time

class ProductionAPITester:
    def __init__(self):
        self.base_url = "https://deedpro-main-api.onrender.com"
        self.test_address = "1358 5th St. La Verne, CA 91750"
        
        # We'll need to get an auth token first
        self.auth_token = None
        
    def get_auth_token(self):
        """Get authentication token from production"""
        try:
            # Use the test account mentioned in docs
            login_data = {
                "email": "test@deedpro-check.com",
                "password": "TestPassword123!"
            }
            
            response = requests.post(
                f"{self.base_url}/users/login",
                json=login_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                result = response.json()
                self.auth_token = result.get("access_token")
                print(f"✅ Authentication successful")
                return True
            else:
                print(f"❌ Authentication failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Authentication error: {str(e)}")
            return False
    
    def test_google_places_validation(self):
        """Test Google Places validation endpoint"""
        print("\n🔍 TESTING GOOGLE PLACES VALIDATION (Production)")
        print("=" * 55)
        
        if not self.auth_token:
            print("❌ No auth token - skipping test")
            return None
            
        try:
            # Prepare request data
            request_data = {
                "fullAddress": self.test_address,
                "street": "1358 5th St",
                "city": "La Verne",
                "state": "CA", 
                "zip": "91750"
            }
            
            headers = {
                "Authorization": f"Bearer {self.auth_token}",
                "Content-Type": "application/json"
            }
            
            print(f"📍 Testing address: {self.test_address}")
            print(f"🌐 Endpoint: {self.base_url}/api/property/validate")
            
            response = requests.post(
                f"{self.base_url}/api/property/validate",
                json=request_data,
                headers=headers,
                timeout=30
            )
            
            print(f"📊 Response Status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                print(f"✅ Google Places validation SUCCESS")
                print(f"📋 Response data:")
                print(json.dumps(result, indent=2))
                return result
            else:
                print(f"❌ Google Places validation FAILED")
                print(f"📄 Error response: {response.text}")
                return None
                
        except Exception as e:
            print(f"❌ Google Places test error: {str(e)}")
            return None
    
    def test_titlepoint_search(self):
        """Test TitlePoint search endpoint"""
        print("\n🏛️ TESTING TITLEPOINT API CALL (Production)")
        print("=" * 55)
        
        if not self.auth_token:
            print("❌ No auth token - skipping test")
            return None
            
        try:
            # Prepare request data
            request_data = {
                "fullAddress": self.test_address,
                "street": "1358 5th St", 
                "city": "La Verne",
                "state": "CA",
                "zip": "91750",
                "neighborhood": "",
                "placeId": ""
            }
            
            headers = {
                "Authorization": f"Bearer {self.auth_token}",
                "Content-Type": "application/json"
            }
            
            print(f"📍 Testing address: {self.test_address}")
            print(f"🌐 Endpoint: {self.base_url}/api/property/search")
            print(f"⏰ This may take 30-60 seconds (TitlePoint processing time)...")
            
            # TitlePoint can take a while, so increase timeout
            response = requests.post(
                f"{self.base_url}/api/property/search",
                json=request_data,
                headers=headers,
                timeout=120  # 2 minutes timeout for TitlePoint
            )
            
            print(f"📊 Response Status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                print(f"✅ TitlePoint API call SUCCESS")
                
                if result.get('success'):
                    print(f"🎉 TitlePoint returned data:")
                    print(f"   🏠 APN: {result.get('apn', 'Not found')}")
                    print(f"   📋 Brief Legal: {result.get('brief_legal', 'Not found')}")
                    print(f"   👤 Primary Owner: {result.get('current_owner_primary', 'Not found')}")
                    print(f"   👥 Secondary Owner: {result.get('current_owner_secondary', 'Not found')}")
                else:
                    print(f"⚠️ TitlePoint service responded but found no data")
                    print(f"📄 Message: {result.get('message', 'No message')}")
                
                print(f"📋 Full response:")
                print(json.dumps(result, indent=2))
                return result
            else:
                print(f"❌ TitlePoint API call FAILED")
                print(f"📄 Error response: {response.text}")
                return None
                
        except Exception as e:
            print(f"❌ TitlePoint test error: {str(e)}")
            return None
    
    def run_full_test(self):
        """Run complete integration test"""
        print("🚀 PRODUCTION API INTEGRATION TEST")
        print("=" * 60)
        print(f"🎯 Test Address: {self.test_address}")
        print(f"🌐 Backend URL: {self.base_url}")
        print("=" * 60)
        
        # Step 1: Authentication
        print("🔐 STEP 1: Authentication")
        if not self.get_auth_token():
            print("❌ Cannot proceed without authentication")
            return
        
        # Step 2: Google Places validation
        google_result = self.test_google_places_validation()
        
        # Step 3: TitlePoint search
        titlepoint_result = self.test_titlepoint_search()
        
        # Step 4: Summary
        print(f"\n📈 TEST SUMMARY")
        print("=" * 50)
        
        google_success = google_result is not None and google_result.get('success', False)
        titlepoint_success = titlepoint_result is not None and titlepoint_result.get('success', False)
        
        print(f"🔍 Google Places: {'✅ SUCCESS' if google_success else '❌ FAILED'}")
        print(f"🏛️ TitlePoint API: {'✅ SUCCESS' if titlepoint_success else '❌ FAILED'}")
        
        if google_success and titlepoint_success:
            print(f"🎉 OVERALL RESULT: ✅ BOTH INTEGRATIONS WORKING PERFECTLY!")
            print(f"🚀 Production environment is ready for address validation and property data retrieval")
        elif google_success:
            print(f"⚠️ PARTIAL SUCCESS: Google Places working, TitlePoint needs attention")
        elif titlepoint_success:
            print(f"⚠️ PARTIAL SUCCESS: TitlePoint working, Google Places needs attention")
        else:
            print(f"❌ BOTH INTEGRATIONS NEED TROUBLESHOOTING")
        
        # Save results
        results = {
            'test_address': self.test_address,
            'timestamp': time.time(),
            'google_places': google_result,
            'titlepoint': titlepoint_result,
            'summary': {
                'google_success': google_success,
                'titlepoint_success': titlepoint_success,
                'overall_success': google_success and titlepoint_success
            }
        }
        
        with open('production_api_test_results.json', 'w') as f:
            json.dump(results, f, indent=2)
        
        print(f"\n💾 Results saved to: production_api_test_results.json")

if __name__ == "__main__":
    tester = ProductionAPITester()
    tester.run_full_test()
