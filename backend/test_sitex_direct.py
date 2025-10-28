"""
Direct SiteX test with hardcoded credentials
"""
import asyncio
import json
import os

# Set credentials directly
os.environ['SITEX_BASE_URL'] = 'https://api.bkiconnect.com'
os.environ['SITEX_CLIENT_ID'] = 'uB23bszvfw2GJiZyjqCUNdZvaANG2knrVuHkpv5DXGTIMZx7'
os.environ['SITEX_CLIENT_SECRET'] = 'mTwRekGDIEmjzgfkGy9oomgqwJagN4kBIG1KVKGZInPsLFt8hD82LDG1EYnT6jr1'
os.environ['SITEX_FEED_ID'] = '100001'

from services.sitex_service import SiteXService

async def test():
    print("=" * 80)
    print("SiteX API Direct Test")
    print("=" * 80)
    
    service = SiteXService()
    
    # Test property from logs: 7811 Irwingrove Dr, Downey, CA 90241
    street = "7811 Irwingrove Drive"
    last_line = "Downey, CA 90241"
    
    print(f"Testing: {street}, {last_line}")
    print()
    
    try:
        print("Step 1: Address search...")
        data = await service.search_address(
            street=street,
            last_line=last_line,
            client_ref="test:direct"
        )
        
        print(f"Response keys: {list(data.keys())}")
        print()
        
        # Handle multi-match
        if isinstance(data.get("Locations"), list) and data["Locations"]:
            print(f"Multi-match: {len(data['Locations'])} locations")
            best = data["Locations"][0]
            print(f"Using: FIPS={best.get('FIPS')}, APN={best.get('APN')}")
            print()
            
            if best.get("FIPS") and best.get("APN"):
                print("Step 2: FIPS+APN lookup...")
                data = await service.search_fips_apn(
                    fips=best["FIPS"],
                    apn=best["APN"],
                    client_ref="test:direct"
                )
                print("Got full property feed")
                print()
        
        # Extract PropertyProfile
        feed = data.get('Feed', {})
        profile = feed.get('PropertyProfile', {})
        
        print("=" * 80)
        print("ALL PROPERTYPROFILE KEYS:")
        print("=" * 80)
        all_keys = sorted(profile.keys())
        for i, key in enumerate(all_keys, 1):
            print(f"{i:3}. {key}")
        print()
        
        print("=" * 80)
        print("LEGAL DESCRIPTION FIELDS:")
        print("=" * 80)
        
        legal_candidates = [
            'LegalDescription', 'BriefLegal', 'LegalBriefDescription', 
            'LegalDescriptionBrief', 'LegalDesc', 'Legal', 'LegalShort', 
            'LegalLong', 'FullLegalDescription'
        ]
        
        found = False
        for field in legal_candidates:
            if field in profile:
                value = profile[field]
                if value:
                    print(f"FOUND: {field}")
                    print(f"       Value: {value[:200]}...")
                    found = True
                else:
                    print(f"EXISTS BUT EMPTY: {field}")
                    found = True
        
        if not found:
            print("None of the standard legal fields found.")
            print()
            print("Searching for ANY field containing 'legal':")
            legal_fields = [k for k in profile.keys() if 'legal' in k.lower()]
            if legal_fields:
                for field in legal_fields:
                    value = profile[field]
                    print(f"  {field} = {value[:100] if value else 'EMPTY'}")
            else:
                print("  (none found)")
        
        print()
        print("=" * 80)
        print("KEY PROPERTY FIELDS:")
        print("=" * 80)
        print(f"APN:              {profile.get('APN', 'N/A')}")
        print(f"SiteCountyName:   {profile.get('SiteCountyName', 'N/A')}")
        print(f"PrimaryOwnerName: {profile.get('PrimaryOwnerName', 'N/A')}")
        print(f"PropertyType:     {profile.get('PropertyType', 'N/A')}")
        print()
        
        # Save full response to file for inspection
        with open('sitex_full_response.json', 'w') as f:
            json.dump(profile, f, indent=2)
        print("Full PropertyProfile saved to: sitex_full_response.json")
        
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test())

