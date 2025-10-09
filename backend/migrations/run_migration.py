#!/usr/bin/env python3
"""
Phase 11 Database Migration Runner
Run this locally to add missing columns to production database
"""

import psycopg2
import sys

# Production database connection
DATABASE_URL = "postgresql://deedpro_user:4MkRMdYMHnnoUwvD03rI3kVfjMLwV6j3@dpg-d208q5umcj7s73as68g0-a.ohio-postgres.render.com/deedpro"

MIGRATION_SQL = """
-- Add missing columns (safe to re-run)
ALTER TABLE deeds ADD COLUMN IF NOT EXISTS apn VARCHAR(50);
ALTER TABLE deeds ADD COLUMN IF NOT EXISTS county VARCHAR(100);
ALTER TABLE deeds ADD COLUMN IF NOT EXISTS owner_type VARCHAR(100);
ALTER TABLE deeds ADD COLUMN IF NOT EXISTS sales_price DECIMAL(15,2);
ALTER TABLE deeds ADD COLUMN IF NOT EXISTS vesting VARCHAR(255);
ALTER TABLE deeds ADD COLUMN IF NOT EXISTS pdf_url VARCHAR(500);
ALTER TABLE deeds ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE deeds ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_deeds_apn ON deeds(apn);
CREATE INDEX IF NOT EXISTS idx_deeds_county ON deeds(county);
CREATE INDEX IF NOT EXISTS idx_deeds_status ON deeds(status);
"""

VERIFY_SQL = """
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'deeds'
ORDER BY ordinal_position;
"""

def run_migration():
    """Run the Phase 11 migration"""
    print("🔗 Connecting to production database...")
    
    try:
        conn = psycopg2.connect(DATABASE_URL)
        print("✅ Connected successfully!")
        
        cursor = conn.cursor()
        
        # Run migration
        print("\n📝 Running migration SQL...")
        cursor.execute(MIGRATION_SQL)
        conn.commit()
        print("✅ Migration completed successfully!")
        
        # Verify
        print("\n🔍 Verifying new columns...")
        cursor.execute(VERIFY_SQL)
        columns = cursor.fetchall()
        
        print("\n📋 Current deeds table schema:")
        print("-" * 60)
        for col in columns:
            col_name = col[0]
            col_type = col[1]
            col_length = f"({col[2]})" if col[2] else ""
            
            # Highlight new columns
            if col_name in ['apn', 'county', 'owner_type', 'sales_price', 'vesting', 'pdf_url', 'metadata', 'completed_at']:
                print(f"  ✨ {col_name:<20} {col_type}{col_length} [NEW!]")
            else:
                print(f"     {col_name:<20} {col_type}{col_length}")
        print("-" * 60)
        
        cursor.close()
        conn.close()
        
        print("\n🎉 SUCCESS! Phase 11 migration complete!")
        print("\n✅ Next steps:")
        print("   1. Test deed creation at https://deedpro-check.vercel.app")
        print("   2. Create a Quitclaim deed")
        print("   3. Verify it saves without errors!")
        
        return True
        
    except psycopg2.Error as e:
        print(f"\n❌ Database error: {e}")
        print("\nTroubleshooting:")
        print("  1. Check your internet connection")
        print("  2. Verify database credentials are correct")
        print("  3. Check if Render database is online")
        return False
        
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("  PHASE 11 DATABASE MIGRATION")
    print("  Adding missing columns to deeds table")
    print("=" * 60)
    
    # Confirm before running
    print("\n⚠️  This will modify the PRODUCTION database!")
    response = input("   Continue? (yes/no): ").strip().lower()
    
    if response != 'yes':
        print("\n❌ Migration cancelled.")
        sys.exit(0)
    
    print("")
    success = run_migration()
    
    sys.exit(0 if success else 1)

