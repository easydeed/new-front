#!/usr/bin/env python3
"""
Phase 15 v5: Partners Tables Migration Runner
Run this to add partners + partner_people tables to production database
"""

import psycopg2
import sys
import os
from dotenv import load_dotenv

load_dotenv()

# Get production database URL from environment
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("❌ ERROR: DATABASE_URL environment variable not set!")
    print("   Add it to your .env file or set it in your environment")
    sys.exit(1)

# Read migration SQL from file
MIGRATION_FILE = "20251016_add_partners_org_scoped.sql"
MIGRATION_SQL = ""

try:
    with open(os.path.join(os.path.dirname(__file__), MIGRATION_FILE), 'r') as f:
        MIGRATION_SQL = f.read()
except FileNotFoundError:
    print(f"❌ ERROR: Migration file {MIGRATION_FILE} not found!")
    sys.exit(1)

VERIFY_SQL = """
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('partners', 'partner_people')
ORDER BY table_name;
"""

def run_migration():
    """Run the Phase 15 v5 migration"""
    print("🔗 Connecting to production database...")
    
    try:
        conn = psycopg2.connect(DATABASE_URL)
        print("✅ Connected successfully!")
        
        cursor = conn.cursor()
        
        # Run migration
        print("\n📝 Running migration SQL...")
        print(f"   Creating tables: partners, partner_people")
        cursor.execute(MIGRATION_SQL)
        conn.commit()
        print("✅ Migration completed successfully!")
        
        # Verify
        print("\n🔍 Verifying new tables...")
        cursor.execute(VERIFY_SQL)
        tables = cursor.fetchall()
        
        if len(tables) == 2:
            print("\n✅ VERIFICATION PASSED:")
            for table in tables:
                print(f"   ✨ Table '{table[0]}' created successfully")
        else:
            print("\n⚠️  VERIFICATION WARNING:")
            print(f"   Expected 2 tables, found {len(tables)}")
        
        cursor.close()
        conn.close()
        
        print("\n🎉 SUCCESS! Phase 15 v5 migration complete!")
        print("\n📊 What was added:")
        print("   • partners table (id, user_id, name, category)")
        print("   • partner_people table (id, partner_id, name, role, email, phone)")
        print("   • Indexes on user_id, name, partner_id")
        print("\n✅ Next steps:")
        print("   1. Deploy frontend with partners components")
        print("   2. Test partners API: GET /api/partners/selectlist")
        print("   3. Create a partner: POST /api/partners")
        print("   4. Use in Modern wizard dropdown!")
        
        return True
        
    except psycopg2.Error as e:
        print(f"\n❌ Database error: {e}")
        print("\nTroubleshooting:")
        print("  1. Check your internet connection")
        print("  2. Verify DATABASE_URL is correct")
        print("  3. Check if Render database is online")
        print("  4. Verify user has CREATE TABLE permissions")
        return False
        
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        return False

if __name__ == "__main__":
    print("=" * 70)
    print("  PHASE 15 v5: INDUSTRY PARTNERS DATABASE MIGRATION")
    print("  Adding partners + partner_people tables")
    print("=" * 70)
    
    # Confirm before running
    print("\n⚠️  This will modify the PRODUCTION database!")
    print("   Tables to create: partners, partner_people")
    response = input("   Continue? (yes/no): ").strip().lower()
    
    if response != 'yes':
        print("\n❌ Migration cancelled.")
        sys.exit(0)
    
    print("")
    success = run_migration()
    
    sys.exit(0 if success else 1)

