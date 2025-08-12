#!/usr/bin/env python3
"""
Property Integration Deployment Script
Applies database schema updates for Google Places, SiteX Data, and TitlePoint integration
"""
import os
import sys
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

def get_db_connection():
    """Get database connection"""
    db_url = os.getenv("DATABASE_URL") or os.getenv("DB_URL")
    if not db_url:
        print("❌ DATABASE_URL not found in environment variables")
        sys.exit(1)
    
    try:
        conn = psycopg2.connect(db_url)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        return conn
    except Exception as e:
        print(f"❌ Failed to connect to database: {e}")
        sys.exit(1)

def apply_schema_updates():
    """Apply property integration schema updates"""
    print("🚀 Starting Property Integration Database Migration...")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Read and execute the schema file
        schema_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'backend', 'property_integration_schema.sql')
        
        if not os.path.exists(schema_file):
            print(f"❌ Schema file not found: {schema_file}")
            return False
        
        print("📄 Reading schema file...")
        with open(schema_file, 'r') as f:
            schema_sql = f.read()
        
        print("📊 Applying database schema updates...")
        cursor.execute(schema_sql)
        
        print("✅ Schema updates applied successfully!")
        
        # Verify tables were created
        cursor.execute("""
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('property_cache_enhanced', 'api_integration_logs', 'property_search_history')
            ORDER BY table_name
        """)
        
        created_tables = cursor.fetchall()
        print(f"✅ Created tables: {[table[0] for table in created_tables]}")
        
        # Verify indexes
        cursor.execute("""
            SELECT indexname FROM pg_indexes 
            WHERE tablename IN ('property_cache_enhanced', 'api_integration_logs', 'property_search_history')
            ORDER BY indexname
        """)
        
        created_indexes = cursor.fetchall()
        print(f"✅ Created indexes: {len(created_indexes)} indexes")
        
        return True
        
    except Exception as e:
        print(f"❌ Schema migration failed: {e}")
        return False
    finally:
        cursor.close()
        conn.close()

def verify_environment():
    """Verify required environment variables"""
    print("🔍 Verifying environment configuration...")
    
    required_vars = [
        'DATABASE_URL',
        'OPENAI_API_KEY',
        'GOOGLE_API_KEY',
        'TITLEPOINT_USER_ID',
        'TITLEPOINT_PASSWORD'
    ]
    
    missing_vars = []
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)
    
    if missing_vars:
        print(f"⚠️  Missing environment variables: {', '.join(missing_vars)}")
        print("💡 These will need to be set in Render environment variables")
    else:
        print("✅ All environment variables are configured")
    
    return len(missing_vars) == 0

def main():
    """Main deployment function"""
    print("🌐 DeedPro Property Integration Deployment")
    print("=" * 50)
    
    # Step 1: Verify environment
    env_ok = verify_environment()
    
    # Step 2: Apply database schema
    schema_ok = apply_schema_updates()
    
    print("\n" + "=" * 50)
    print("📋 DEPLOYMENT SUMMARY")
    print("=" * 50)
    
    if schema_ok:
        print("✅ Database schema: UPDATED")
    else:
        print("❌ Database schema: FAILED")
    
    if env_ok:
        print("✅ Environment variables: CONFIGURED")
    else:
        print("⚠️  Environment variables: NEEDS ATTENTION")
    
    print("\n🎯 NEXT STEPS:")
    print("1. 📦 Install frontend dependencies: cd frontend && npm install")
    print("2. 📦 Install backend dependencies: cd backend && pip install -r requirements.txt")
    print("3. 🌐 Set NEXT_PUBLIC_GOOGLE_API_KEY in Vercel environment")
    print("4. 🔧 Set backend API keys in Render environment")
    print("5. 🚀 Deploy to production")
    
    if schema_ok:
        print("\n🎉 Property integration is ready to use!")
        print("💡 Users can now:")
        print("   - Search properties with Google Places autocomplete")
        print("   - Get APN/FIPS data from SiteX")
        print("   - Enrich with ownership/tax data from TitlePoint")
        print("   - Auto-populate deed wizard fields")
    
    return schema_ok and env_ok

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
