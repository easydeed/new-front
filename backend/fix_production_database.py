#!/usr/bin/env python3
"""
DeedPro Production Database Fix Script
This script connects to your Render database and fixes all the missing tables.
"""

import psycopg2
import sys

def fix_production_database():
    print("🚀 DeedPro Database Fix Script")
    print("=" * 50)
    
    # Your Render database connection
    DATABASE_URL = "postgresql://deedpro_user:4MkRMdYMHnnoUwvD03rI3kVfjMLwV6j3@dpg-d208q5umcj7s73as68g0-a.ohio-postgres.render.com/deedpro"
    
    try:
        print("🔗 Connecting to Render database...")
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        print("✅ Connected successfully!")
        
        print("\n📋 Checking current database status...")
        
        # Check what tables exist
        cursor.execute("""
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name;
        """)
        existing_tables = [row[0] for row in cursor.fetchall()]
        print(f"   Found {len(existing_tables)} existing tables: {', '.join(existing_tables)}")
        
        print("\n🔧 Creating missing tables...")
        
        # Create plan_limits table (This fixes the 500 error!)
        print("   Creating plan_limits table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS plan_limits (
                id SERIAL PRIMARY KEY,
                plan_name VARCHAR(50) UNIQUE NOT NULL,
                max_deeds_per_month INTEGER,
                api_calls_per_month INTEGER,
                ai_assistance BOOLEAN DEFAULT TRUE,
                integrations_enabled BOOLEAN DEFAULT FALSE,
                priority_support BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        # Create user_profiles table
        print("   Creating user_profiles table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_profiles (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                company_name VARCHAR(255),
                business_address TEXT,
                license_number VARCHAR(100),
                role VARCHAR(50),
                default_county VARCHAR(100),
                preferred_deed_type VARCHAR(50) DEFAULT 'grant_deed',
                auto_populate_company_info BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        # Create pricing table
        print("   Creating pricing table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS pricing (
                id SERIAL PRIMARY KEY,
                plan_name VARCHAR(50) UNIQUE NOT NULL,
                price DECIMAL(10,2) NOT NULL,
                stripe_price_id VARCHAR(50),
                stripe_product_id VARCHAR(50),
                features JSONB,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        print("\n📝 Inserting default data...")
        
        # Insert plan limits
        cursor.execute("""
            INSERT INTO plan_limits (plan_name, max_deeds_per_month, api_calls_per_month, ai_assistance, integrations_enabled, priority_support) 
            VALUES
            ('free', 5, 100, true, false, false),
            ('professional', -1, 1000, true, true, true),
            ('enterprise', -1, 5000, true, true, true)
            ON CONFLICT (plan_name) DO NOTHING;
        """)
        
        # Insert pricing data
        cursor.execute("""
            INSERT INTO pricing (plan_name, price, features) VALUES
            ('free', 0.00, '["5 deeds per month", "Basic templates", "Email support"]'::jsonb),
            ('professional', 29.00, '["Unlimited deeds", "Advanced templates", "Priority support", "Integrations"]'::jsonb),
            ('enterprise', 99.00, '["Everything", "API access", "Custom templates", "Team management"]'::jsonb)
            ON CONFLICT (plan_name) DO NOTHING;
        """)
        
        print("\n🔧 Fixing existing user data...")
        
        # Fix test user role
        cursor.execute("""
            UPDATE users SET role = 'user' 
            WHERE email = 'test@deedpro-check.com' AND (role IS NULL OR role = '');
        """)
        
        # Ensure all users have a plan
        cursor.execute("""
            UPDATE users SET plan = 'free' WHERE plan IS NULL;
        """)
        
        # Commit all changes
        conn.commit()
        
        print("\n✅ Database fixes completed successfully!")
        print("\n📊 Final verification...")
        
        # Check plan_limits
        cursor.execute("SELECT COUNT(*) FROM plan_limits;")
        plan_count = cursor.fetchone()[0]
        print(f"   Plan limits: {plan_count} plans created")
        
        # Check pricing
        cursor.execute("SELECT COUNT(*) FROM pricing;")
        pricing_count = cursor.fetchone()[0]
        print(f"   Pricing data: {pricing_count} plans configured")
        
        # Check test user
        cursor.execute("SELECT email, role, plan FROM users WHERE email = 'test@deedpro-check.com';")
        user_data = cursor.fetchone()
        if user_data:
            print(f"   Test user: {user_data[0]} (role: {user_data[1]}, plan: {user_data[2]})")
        
        cursor.close()
        conn.close()
        
        print("\n🎉 SUCCESS! Your database is now fixed!")
        print("🔄 Next step: Your backend service will automatically use these fixes.")
        print("📝 The 500 errors on profile endpoint should now be resolved!")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Error fixing database: {e}")
        print("📞 Please share this error message for help.")
        return False

if __name__ == "__main__":
    fix_production_database()
