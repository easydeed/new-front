"""
Migration: Create partners table (Fixed for missing organization_id)
Date: 2025-10-17
Description: Add Industry Partners infrastructure (user-scoped, upgradeable to org-scoped)
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import get_db_connection

def upgrade():
    """Create partners table"""
    conn = get_db_connection()
    if not conn:
        print("❌ Failed to connect to database")
        return False
    
    try:
        cursor = conn.cursor()
        
        # Step 1: Add organization_id to users table if it doesn't exist
        print("🔍 Checking if users.organization_id exists...")
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='users' AND column_name='organization_id'
        """)
        
        if not cursor.fetchone():
            print("➕ Adding organization_id column to users table...")
            cursor.execute("""
                ALTER TABLE users 
                ADD COLUMN organization_id VARCHAR(255) DEFAULT 'default-org'
            """)
            cursor.execute("""
                UPDATE users 
                SET organization_id = 'default-org' 
                WHERE organization_id IS NULL
            """)
            print("✅ Added organization_id to users table")
        else:
            print("✅ users.organization_id already exists")
        
        # Step 2: Create partners table
        print("🔍 Creating partners table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS partners (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                organization_id VARCHAR(255) NOT NULL DEFAULT 'default-org',
                created_by_user_id INTEGER NOT NULL,
                
                category VARCHAR(50) NOT NULL DEFAULT 'other',
                role VARCHAR(50) NOT NULL DEFAULT 'other',
                
                company_name VARCHAR(255) NOT NULL,
                contact_name VARCHAR(255),
                email VARCHAR(255),
                phone VARCHAR(50),
                
                address_line1 VARCHAR(255),
                address_line2 VARCHAR(255),
                city VARCHAR(100),
                state VARCHAR(50),
                postal_code VARCHAR(20),
                
                notes TEXT,
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                
                FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)
        print("✅ Partners table created")
        
        # Step 3: Create indexes
        print("🔍 Creating indexes...")
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_partners_org 
            ON partners(organization_id)
        """)
        
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_partners_created_by 
            ON partners(created_by_user_id)
        """)
        
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_partners_active 
            ON partners(is_active)
        """)
        print("✅ Indexes created")
        
        conn.commit()
        print("")
        print("=" * 60)
        print("✅ MIGRATION SUCCESSFUL!")
        print("=" * 60)
        print("📊 Summary:")
        print("  - users.organization_id column: ✅")
        print("  - partners table: ✅")
        print("  - indexes (3): ✅")
        print("=" * 60)
        return True
        
    except Exception as e:
        conn.rollback()
        print("")
        print("=" * 60)
        print(f"❌ MIGRATION FAILED")
        print("=" * 60)
        print(f"Error: {e}")
        print("")
        import traceback
        print("Full traceback:")
        traceback.print_exc()
        print("=" * 60)
        return False
    finally:
        cursor.close()
        conn.close()

def downgrade():
    """Drop partners table and organization_id column"""
    conn = get_db_connection()
    if not conn:
        print("❌ Failed to connect to database")
        return False
    
    try:
        cursor = conn.cursor()
        
        print("🔍 Dropping partners table...")
        cursor.execute("DROP TABLE IF EXISTS partners CASCADE")
        print("✅ Partners table dropped")
        
        print("🔍 Removing organization_id from users...")
        cursor.execute("""
            ALTER TABLE users 
            DROP COLUMN IF EXISTS organization_id
        """)
        print("✅ organization_id column removed")
        
        conn.commit()
        print("✅ Downgrade successful")
        return True
    except Exception as e:
        conn.rollback()
        print(f"❌ Downgrade failed: {e}")
        return False
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "down":
        downgrade()
    else:
        upgrade()

