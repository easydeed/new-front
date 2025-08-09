#!/usr/bin/env python3
"""
Test Stripe Integration - DeedPro
"""

import os
import stripe
import requests
from dotenv import load_dotenv

load_dotenv()

def test_stripe_keys():
    """Test Stripe API keys and basic functionality"""
    
    print("🔑 Testing Stripe Integration...")
    print("=" * 50)
    
    # Check environment variables
    stripe_secret = os.getenv("STRIPE_SECRET_KEY")
    stripe_publishable = os.getenv("STRIPE_PUBLISHABLE_KEY")
    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")
    
    print("📋 Environment Variables:")
    print(f"   STRIPE_SECRET_KEY: {'✅ Set' if stripe_secret else '❌ Missing'}")
    if stripe_secret:
        print(f"      Prefix: {stripe_secret[:7]}...")
        print(f"      Environment: {'TEST' if stripe_secret.startswith('sk_test_') else 'LIVE' if stripe_secret.startswith('sk_live_') else 'UNKNOWN'}")
    
    print(f"   STRIPE_PUBLISHABLE_KEY: {'✅ Set' if stripe_publishable else '❌ Missing'}")
    if stripe_publishable:
        print(f"      Prefix: {stripe_publishable[:7]}...")
        print(f"      Environment: {'TEST' if stripe_publishable.startswith('pk_test_') else 'LIVE' if stripe_publishable.startswith('pk_live_') else 'UNKNOWN'}")
    
    print(f"   STRIPE_WEBHOOK_SECRET: {'✅ Set' if webhook_secret else '❌ Missing'}")
    
    if not stripe_secret:
        print("\n❌ Cannot test Stripe without secret key")
        return False
    
    # Test Stripe API
    print(f"\n🧪 Testing Stripe API...")
    stripe.api_key = stripe_secret
    
    try:
        # Test 1: Retrieve account info
        print("   📊 Testing account access...")
        account = stripe.Account.retrieve()
        print(f"   ✅ Account access successful")
        print(f"      Account ID: {account.id}")
        print(f"      Country: {account.country}")
        print(f"      Email: {account.email}")
        print(f"      Details submitted: {account.details_submitted}")
        print(f"      Charges enabled: {account.charges_enabled}")
        
    except Exception as e:
        print(f"   ❌ Account access failed: {e}")
        return False
    
    try:
        # Test 2: List products
        print("\n   📦 Testing products...")
        products = stripe.Product.list(limit=5)
        print(f"   ✅ Products retrieved: {len(products.data)} products found")
        
        for product in products.data:
            print(f"      - {product.name} (ID: {product.id})")
            
    except Exception as e:
        print(f"   ❌ Products retrieval failed: {e}")
    
    try:
        # Test 3: List prices/plans
        print("\n   💰 Testing prices...")
        prices = stripe.Price.list(limit=10)
        print(f"   ✅ Prices retrieved: {len(prices.data)} prices found")
        
        for price in prices.data:
            amount = price.unit_amount / 100 if price.unit_amount else 0
            print(f"      - ${amount:.2f} {price.currency.upper()} ({price.id})")
            
    except Exception as e:
        print(f"   ❌ Prices retrieval failed: {e}")
    
    try:
        # Test 4: Create a test customer (then delete)
        print("\n   👤 Testing customer creation...")
        test_customer = stripe.Customer.create(
            email="test@stripe-integration-test.com",
            name="Test Customer",
            description="DeedPro Integration Test"
        )
        print(f"   ✅ Customer created: {test_customer.id}")
        
        # Clean up - delete test customer
        test_customer.delete()
        print(f"   🗑️ Test customer deleted")
        
    except Exception as e:
        print(f"   ❌ Customer creation failed: {e}")
    
    return True

def test_stripe_endpoints():
    """Test Stripe-related API endpoints"""
    
    print(f"\n🌐 Testing Stripe API Endpoints...")
    base_url = "https://deedpro-main-api.onrender.com"
    
    # Login to get token
    login_response = requests.post(f"{base_url}/users/login", json={
        "email": "test@deedpro-check.com",
        "password": "TestPassword123!"
    })
    
    if not login_response.ok:
        print(f"❌ Cannot test endpoints - login failed")
        return False
    
    token = login_response.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test pricing endpoint
    try:
        response = requests.get(f"{base_url}/pricing/plans", headers=headers, timeout=10)
        if response.ok:
            plans = response.json()
            print(f"   ✅ Pricing plans endpoint: {len(plans)} plans")
            for plan in plans:
                print(f"      - {plan.get('name', 'Unnamed')}: ${plan.get('price', 0)}")
        else:
            print(f"   ❌ Pricing plans endpoint failed: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Pricing plans error: {e}")
    
    # Test subscription creation endpoint
    try:
        response = requests.post(
            f"{base_url}/create-subscription",
            json={"plan": "professional"},
            headers=headers,
            timeout=10
        )
        if response.ok:
            print(f"   ✅ Subscription creation endpoint accessible")
        else:
            print(f"   ❌ Subscription creation failed: {response.status_code}")
            if response.status_code == 404:
                print(f"      (Endpoint may not exist)")
    except Exception as e:
        print(f"   ❌ Subscription creation error: {e}")

if __name__ == "__main__":
    print("🚀 DeedPro Stripe Integration Test")
    print("=" * 50)
    
    stripe_works = test_stripe_keys()
    
    if stripe_works:
        test_stripe_endpoints()
    
    print("\n" + "=" * 50)
    print("Stripe integration test complete!")
