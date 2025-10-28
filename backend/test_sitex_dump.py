"""
Quick endpoint to dump SiteX raw response
Add this to main.py temporarily to see raw SiteX data
"""

@app.get("/debug/sitex-dump")
async def debug_sitex_dump(address: str = "7811 Irwingrove Dr, Downey, CA 90241"):
    """Dump raw SiteX response for debugging"""
    from services.sitex_service import SiteXService
    
    service = SiteXService()
    
    # Parse address
    parts = address.split(',')
    street = parts[0].strip()
    last_line = ','.join(parts[1:]).strip() if len(parts) > 1 else "CA"
    
    try:
        # Make SiteX call
        data = await service.search_address(
            street=street,
            last_line=last_line,
            client_ref="debug:dump"
        )
        
        # Handle multi-match
        if isinstance(data.get("Locations"), list) and data["Locations"]:
            best = data["Locations"][0]
            if best.get("FIPS") and best.get("APN"):
                data = await service.search_fips_apn(
                    fips=best["FIPS"],
                    apn=best["APN"],
                    client_ref="debug:dump"
                )
        
        # Extract PropertyProfile
        feed = data.get('Feed', {})
        profile = feed.get('PropertyProfile', {})
        
        # Find all legal fields
        legal_fields = {k: v for k, v in profile.items() if 'legal' in k.lower()}
        
        return {
            "success": True,
            "all_profile_keys": list(profile.keys()),
            "legal_fields_found": legal_fields,
            "key_fields": {
                "APN": profile.get("APN"),
                "SiteCountyName": profile.get("SiteCountyName"),
                "PrimaryOwnerName": profile.get("PrimaryOwnerName"),
                "LegalDescription": profile.get("LegalDescription"),
                "BriefLegal": profile.get("BriefLegal"),
                "LegalBriefDescription": profile.get("LegalBriefDescription"),
                "LegalDescriptionBrief": profile.get("LegalDescriptionBrief"),
            },
            "first_50_keys": list(profile.keys())[:50]
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

