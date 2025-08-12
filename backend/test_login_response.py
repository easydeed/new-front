#!/usr/bin/env python3
"""
Test what the actual login response format looks like
"""

import requests
import json

API_URL = "https://deedpro-main-api.onrender.com"

def test_login_response():
    print("=" * 60)
    print("🔍 Testing Login Response Format")
    print("=" * 60)
    
    credentials = {
        "email": "test@deedpro-check.com",
        "password": "TestPassword123!"
    }
    
    try:
        response = requests.post(f"{API_URL}/users/login", 
            json=credentials,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ LOGIN SUCCESS")
            print(f"Response structure:")
            print(json.dumps(data, indent=2))
            
            # Check token format
            token = data.get('access_token') or data.get('token') or data.get('jwt')
            if token:
                print(f"\n🔑 Token found: {token[:50]}...")
                
                # Decode token to check contents
                try:
                    payload = json.loads(__import__('base64').b64decode(token.split('.')[1] + '==='))
                    print(f"Token payload:")
                    print(json.dumps(payload, indent=2))
                    
                    # Check expiration
                    import time
                    current_time = time.time()
                    expires_at = payload.get('exp', 0)
                    
                    if expires_at:
                        expires_in_minutes = (expires_at - current_time) / 60
                        print(f"\n⏰ Token expires in: {expires_in_minutes:.1f} minutes")
                        
                        if expires_in_minutes < 5:
                            print(f"⚠️  WARNING: Token expires very soon!")
                        elif expires_in_minutes < 60:
                            print(f"ℹ️  Token expires in less than 1 hour")
                        else:
                            print(f"✅ Token has good expiration time")
                    
                except Exception as e:
                    print(f"❌ Error decoding token: {e}")
            else:
                print(f"❌ No token found in response!")
                
        else:
            print(f"❌ LOGIN FAILED")
            try:
                error_data = response.json()
                print(f"Error: {error_data}")
            except:
                print(f"Error: {response.text}")
                
    except Exception as e:
        print(f"💥 ERROR: {e}")

if __name__ == "__main__":
    test_login_response()
