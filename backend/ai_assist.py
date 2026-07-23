from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import os
from dotenv import load_dotenv

# For OpenAI integration (install with: pip install openai)
try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    print("Warning: OpenAI package not installed. AI assistance will use mock responses.")

load_dotenv()

# Router for AI assistance endpoints
# T4: the router that lived here (no-auth POST /api/ai/assist, legacy OpenAI
# SDK, mock fallback) was removed — it shadowed the authenticated router in
# api/ai_assist.py and had no consumers. This module now provides only the
# suggest_defaults / validate_deed_data helpers used by main.py.


def suggest_defaults(user_data, deed_data, recent_properties=None):
    """
    Generate intelligent defaults based on user profile and cached data
    This is the core AI function for the "walking on a cloud" experience
    """
    suggestions = {}
    
    if not user_data:
        return suggestions
    
    profile = user_data.get('profile', {})
    cached_property = user_data.get('cached_property')
    
    # Auto-populate company/business information
    if profile.get('auto_populate_company_info', True):
        if not deed_data.get('recordingRequestedBy') and profile.get('company_name'):
            suggestions['recordingRequestedBy'] = f"{profile['company_name']} - {profile.get('role', 'Escrow Officer').title()}"
        
        if not deed_data.get('mailTo') and profile.get('business_address'):
            suggestions['mailTo'] = profile['business_address']
    
    # Suggest deed type based on user role and preferences
    if not deed_data.get('deedType'):
        if profile.get('role') == 'escrow_officer':
            suggestions['deedType'] = profile.get('preferred_deed_type', 'grant_deed')
        elif profile.get('role') == 'title_officer':
            suggestions['deedType'] = 'grant_deed'  # Most common for title companies
        else:
            suggestions['deedType'] = 'grant_deed'  # Safe default
    
    # Auto-populate geographic defaults
    if not deed_data.get('county') and profile.get('default_county'):
        suggestions['county'] = profile['default_county']
    
    # Use cached property data for similar addresses
    if cached_property and deed_data.get('propertySearch'):
        search_address = deed_data['propertySearch'].lower()
        cached_address = cached_property.get('property_address', '').lower()
        
        # If addresses are similar, suggest cached data
        if search_address in cached_address or cached_address in search_address:
            if not deed_data.get('legalDescription') and cached_property.get('legal_description'):
                suggestions['legalDescription'] = cached_property['legal_description']
            if not deed_data.get('apn') and cached_property.get('apn'):
                suggestions['apn'] = cached_property['apn']
            if not deed_data.get('county') and cached_property.get('county'):
                suggestions['county'] = cached_property['county']
            if not deed_data.get('city') and cached_property.get('city'):
                suggestions['city'] = cached_property['city']
    
    # Smart defaults for notary information
    if profile.get('role') == 'notary' or profile.get('notary_commission_exp'):
        if not deed_data.get('notaryCounty') and profile.get('default_county'):
            suggestions['notaryCounty'] = profile['default_county']
    
    # Generate helpful AI tips based on context
    ai_tips = []
    
    if not deed_data.get('propertySearch'):
        ai_tips.append("💡 Start by searching for the property address - I'll auto-populate other fields!")
    
    if deed_data.get('propertySearch') and not cached_property:
        ai_tips.append("🔍 This looks like a new property - I'll cache the details for next time!")
    
    if profile.get('role') == 'escrow_officer' and not deed_data.get('orderNo'):
        ai_tips.append("📋 Don't forget to add your order number for proper tracking!")
    
    if deed_data.get('salesPrice') and not deed_data.get('documentaryTax'):
        ai_tips.append("💰 I can calculate documentary tax for you - just ask!")
    
    suggestions['ai_tips'] = ai_tips
    
    return suggestions

def validate_deed_data(deed_data, deed_type):
    """
    Provide real-time validation and suggestions for deed data
    Returns validation results and improvement suggestions
    """
    validation = {
        'is_valid': True,
        'warnings': [],
        'suggestions': [],
        'missing_required': []
    }
    
    # Required fields based on deed type
    required_fields = {
        'grant_deed': ['grantorName', 'granteeName', 'propertySearch', 'county'],
        'quitclaim_deed': ['grantorName', 'granteeName', 'propertySearch', 'county'],
        'warranty_deed': ['grantorName', 'granteeName', 'propertySearch', 'county', 'salesPrice'],
        'trust_transfer': ['grantorName', 'granteeName', 'propertySearch', 'county']
    }
    
    # Check required fields
    required = required_fields.get(deed_type, required_fields['grant_deed'])
    for field in required:
        if not deed_data.get(field):
            validation['missing_required'].append(field)
            validation['is_valid'] = False
    
    # Validate specific field formats
    if deed_data.get('salesPrice'):
        try:
            price = float(deed_data['salesPrice'].replace('$', '').replace(',', ''))
            if price <= 0:
                validation['warnings'].append("Sales price should be greater than $0")
        except ValueError:
            validation['warnings'].append("Sales price format is invalid")
    
    if deed_data.get('apn'):
        apn = deed_data['apn'].replace('-', '').replace(' ', '')
        if not apn.isdigit() or len(apn) < 8:
            validation['warnings'].append("APN format may be incorrect (should be 8+ digits)")
    
    # Provide helpful suggestions
    if deed_data.get('grantorName') and deed_data.get('granteeName'):
        if deed_data['grantorName'].lower() == deed_data['granteeName'].lower():
            validation['warnings'].append("Grantor and Grantee appear to be the same - please verify")
    
    if deed_data.get('propertySearch') and not deed_data.get('legalDescription'):
        validation['suggestions'].append("Consider adding a legal description for better document accuracy")
    
    if deed_data.get('vesting') and 'joint tenant' in deed_data['vesting'].lower():
        validation['suggestions'].append("Verify right of survivorship language for joint tenancy")
    
    return validation 