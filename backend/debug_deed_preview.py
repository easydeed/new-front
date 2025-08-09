#!/usr/bin/env python3
"""
Debug the deed preview async issue by testing locally
"""

import sys
import traceback
from pydantic import BaseModel
from typing import Dict, Any
from ai_assist import suggest_defaults, validate_deed_data

class MockDeedData(BaseModel):
    deed_type: str
    data: dict

def test_ai_functions():
    """Test if the AI functions work with mock data"""
    print("🔍 Testing AI functions locally...")
    
    # Mock data similar to what the API receives
    mock_deed = MockDeedData(
        deed_type="grant_deed",
        data={
            "grantor": "John Doe",
            "grantee": "Jane Smith", 
            "county": "Los Angeles",
            "propertySearch": "123 Test St"
        }
    )
    
    mock_user_data = {
        'profile': {
            'company_name': 'Test Company',
            'default_county': 'Los Angeles'
        },
        'cached_property': None
    }
    
    try:
        print("📝 Testing suggest_defaults...")
        ai_suggestions = suggest_defaults(mock_user_data, mock_deed.data)
        print(f"✅ suggest_defaults worked: {type(ai_suggestions)}")
        
        print("🔍 Testing validate_deed_data...")
        validation = validate_deed_data(mock_deed.data, mock_deed.deed_type)
        print(f"✅ validate_deed_data worked: {type(validation)}")
        
        # Test the data merge (this is where the error might occur)
        print("🔗 Testing data merge...")
        enhanced_data = {**ai_suggestions, **mock_deed.data}
        print(f"✅ Data merge worked: {type(enhanced_data)}")
        
        # Check if deed.data.get() works
        print("🎯 Testing deed.data.get()...")
        property_search = mock_deed.data.get('propertySearch')
        print(f"✅ deed.data.get() worked: {property_search}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error found: {e}")
        print(f"📋 Error type: {type(e)}")
        print("📊 Full traceback:")
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_ai_functions()
    if success:
        print("\n🎉 All AI functions work locally!")
        print("💡 The issue might be in the FastAPI async context")
    else:
        print("\n💥 Found the issue!")
