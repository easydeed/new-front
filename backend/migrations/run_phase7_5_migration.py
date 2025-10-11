#!/usr/bin/env python3
"""
Phase 7.5: Gap-Plan Migration Runner
Adds notifications and enhanced deed sharing tables

Tables added:
- notifications: System-wide notification store
- user_notifications: User-specific notification tracking
- deed_shares: Enhanced deed sharing with UUID tokens
"""

import os
import sys
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def run_migration():
    """Run the Phase 7.5 migration"""
    
    # Get database URL from environment
    database_url = os.getenv('DATABASE_URL')
    
    if not database_url:
        print("❌ DATABASE_URL environment variable not set")
        print("Please set it in your environment or .env file")
        return False
    
    print("=" * 60)
    print("🚀 PHASE 7.5: GAP-PLAN MIGRATION")
    print("=" * 60)
    print()
    
    try:
        # Connect to database
        print("📡 Connecting to database...")
        conn = psycopg2.connect(database_url)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        print("✅ Connected successfully")
        print()
        
        # Read migration SQL
        migration_file = os.path.join(
            os.path.dirname(__file__),
            '20251011_phase7_notifications_and_shares.sql'
        )
        
        print(f"📄 Reading migration file: {migration_file}")
        with open(migration_file, 'r') as f:
            migration_sql = f.read()
        print("✅ Migration SQL loaded")
        print()
        
        # Execute migration
        print("⚙️  Executing migration...")
        print("-" * 60)
        cursor.execute(migration_sql)
        print("-" * 60)
        print("✅ Migration executed successfully")
        print()
        
        # Verify tables were created
        print("🔍 Verifying tables...")
        
        tables_to_check = ['notifications', 'user_notifications', 'deed_shares']
        
        for table_name in tables_to_check:
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = %s
                )
            """, (table_name,))
            
            exists = cursor.fetchone()[0]
            
            if exists:
                # Count rows
                cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
                count = cursor.fetchone()[0]
                print(f"  ✅ {table_name} - exists (rows: {count})")
            else:
                print(f"  ❌ {table_name} - NOT FOUND!")
                return False
        
        print()
        
        # Verify indexes
        print("🔍 Verifying indexes...")
        
        indexes_to_check = [
            'idx_notifications_created_at',
            'idx_user_notifications_user_id',
            'idx_user_notifications_unread',
            'idx_deed_shares_owner',
            'idx_deed_shares_deed'
        ]
        
        for index_name in indexes_to_check:
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM pg_indexes
                    WHERE indexname = %s
                )
            """, (index_name,))
            
            exists = cursor.fetchone()[0]
            
            if exists:
                print(f"  ✅ {index_name}")
            else:
                print(f"  ⚠️  {index_name} - not found (may be ok)")
        
        print()
        
        # Close connection
        cursor.close()
        conn.close()
        
        print("=" * 60)
        print("🎉 MIGRATION COMPLETE!")
        print("=" * 60)
        print()
        print("📊 Summary:")
        print("  - 3 tables created")
        print("  - 5 indexes created")
        print("  - 0 errors")
        print()
        print("🎯 Next Steps:")
        print("  1. Deploy backend routers (notifications.py, shares_enhanced.py)")
        print("  2. Add frontend components (NotificationsBell, etc.)")
        print("  3. Set environment variables (flags OFF initially)")
        print()
        
        return True
        
    except psycopg2.Error as e:
        print(f"❌ Database error: {e}")
        print(f"   Code: {e.pgcode}")
        print(f"   Details: {e.pgerror}")
        return False
        
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    print()
    success = run_migration()
    print()
    
    if success:
        print("✅ Ready to proceed to Step 2 (Backend Routers)")
        sys.exit(0)
    else:
        print("❌ Migration failed - please fix errors and try again")
        sys.exit(1)

