"""
Migration: Create partners table
Date: 2025-10-17
Description: Add Industry Partners infrastructure (org-scoped)
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
        
        # Create partners table
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
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create indexes
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
        
        conn.commit()
        print("✅ Partners table created successfully")
        print("✅ Indexes created successfully")
        return True
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Migration failed: {e}")
        return False
    finally:
        cursor.close()
        conn.close()

def downgrade():
    """Drop partners table"""
    conn = get_db_connection()
    if not conn:
        print("❌ Failed to connect to database")
        return False
    
    try:
        cursor = conn.cursor()
        cursor.execute("DROP TABLE IF EXISTS partners CASCADE")
        conn.commit()
        print("✅ Partners table dropped successfully")
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

