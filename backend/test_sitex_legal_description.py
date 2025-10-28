"""
Test script to check SiteX response for legal description fields
Run this to see ALL fields returned by SiteX for a specific property
"""
import asyncio
import sys
import os
from dotenv import load_dotenv
from services.sitex_service import SiteXService
import json

# Load test environment variables
load_dotenv('.env.test')

async def test_sitex_property():
    # Test property: 1358 5th St, La Verne, CA 91750
    street = "1358 5th Street"
    last_line = "La Verne, CA 91750"
    
    print("=" * 80)
    print("Testing SiteX API for Legal Description")
    print("=" * 80)
    print(f"Property: {street}, {last_line}")
    print()
    
    service = SiteXService()
    
    if not service.is_configured():
        print("ERROR: SiteX not configured. Set these environment variables:")
        print("   - SITEX_CLIENT_ID")
        print("   - SITEX_CLIENT_SECRET")
        print("   - SITEX_FEED_ID")
        sys.exit(1)
    
        print("OK: SiteX configured")
    print()
    
    try:
        # Step 1: Address search (may return multi-match)
        print("Step 1: Searching by address...")
        data = await service.search_address(
            street=street,
            last_line=last_line,
            client_ref="test:legal_description"
        )
        
        print(f"OK: Got response with keys: {list(data.keys())}")
        print()
        
        # Step 2: Check if multi-match, if so, resolve with FIPS+APN
        if isinstance(data.get("Locations"), list) and data["Locations"]:
            print("Multi-match result, picking best candidate...")
            best = data["Locations"][0]  # Pick first for testing
            print(f"   FIPS: {best.get('FIPS')}")
            print(f"   APN: {best.get('APN')}")
            print()
            
            if best.get("FIPS") and best.get("APN"):
                print("Step 2: Re-querying with FIPS+APN for full property data...")
                data = await service.search_fips_apn(
                    fips=best["FIPS"],
                    apn=best["APN"],
                    client_ref="test:legal_description"
                )
                print(f"OK: Got full property feed")
                print()
        
        # Step 3: Extract PropertyProfile
        feed = data.get('Feed', {})
        profile = feed.get('PropertyProfile', {})
        
        if not profile:
            print("ERROR: No PropertyProfile in response")
            print(f"Full response: {json.dumps(data, indent=2)}")
            sys.exit(1)
        
        print("=" * 80)
        print("ALL PROPERTYPROFILE FIELDS:")
        print("=" * 80)
        
        # Print all keys alphabetically
        for key in sorted(profile.keys()):
            value = profile[key]
            # Truncate long values
            if isinstance(value, str) and len(value) > 100:
                value_str = value[:100] + "..."
            else:
                value_str = str(value)
            print(f"{key:40} = {value_str}")
        
        print()
        print("=" * 80)
        print("LEGAL DESCRIPTION FIELDS:")
        print("=" * 80)
        
        # Check various legal description field names
        legal_fields = [
            'LegalDescription',
            'LegalDescriptionBrief',
            'BriefLegal',
            'LegalBriefDescription',
            'Legal',
            'LegalDesc',
            'LegalShort',
            'LegalLong',
            'FullLegalDescription'
        ]
        
        found_any = False
        for field in legal_fields:
            if field in profile:
                value = profile[field]
                print(f"FOUND: {field:30} = {value}")
                found_any = True
        
        if not found_any:
            print("ERROR: No legal description fields found!")
            print()
            print("NOTE: Searching for fields containing 'legal' (case-insensitive):")
            for key in profile.keys():
                if 'legal' in key.lower():
                    print(f"   {key} = {profile[key]}")
        
        print()
        print("=" * 80)
        print("KEY PROPERTY FIELDS:")
        print("=" * 80)
        print(f"APN:                  {profile.get('APN', 'N/A')}")
        print(f"SiteCountyName:       {profile.get('SiteCountyName', 'N/A')}")
        print(f"PrimaryOwnerName:     {profile.get('PrimaryOwnerName', 'N/A')}")
        print(f"PropertyType:         {profile.get('PropertyType', 'N/A')}")
        print()
        
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(test_sitex_property())

