#!/usr/bin/env python3
"""
Run migration to add requested_by column to deeds table
Phase 16 - October 23, 2025
"""

import os
import psycopg2
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')

if not DATABASE_URL:
    print("[ERROR] DATABASE_URL not found in environment variables")
    print("Please set DATABASE_URL in your .env file")
    exit(1)

print("=" * 80)
print("Phase 16: Add requested_by Column to deeds Table")
print("=" * 80)

def run_migration():
    """Run the migration to add requested_by column"""
    print("\n[INFO] Connecting to database...")
    
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        print("[SUCCESS] Connected successfully")
        
        # Check if column already exists
        print("\n[INFO] Checking if requested_by column already exists...")
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'deeds' 
            AND column_name = 'requested_by'
        """)
        exists = cursor.fetchone()
        
        if exists:
            print("[SUCCESS] Column 'requested_by' already exists - no migration needed")
            cursor.close()
            conn.close()
            return True
        
        print("[INFO] Column does not exist - running migration...")
        
        # Add the column
        print("\n[INFO] Adding requested_by column...")
        cursor.execute("""
            ALTER TABLE deeds 
            ADD COLUMN requested_by VARCHAR(255)
        """)
        
        # Add comment
        cursor.execute("""
            COMMENT ON COLUMN deeds.requested_by IS 
            'Name of person/company requesting the deed (e.g., escrow officer, title company rep)'
        """)
        
        conn.commit()
        print("[SUCCESS] Column added successfully")
        
        # Verify the change
        print("\n[INFO] Verifying migration...")
        cursor.execute("""
            SELECT column_name, data_type, character_maximum_length, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'deeds' 
            AND column_name = 'requested_by'
        """)
        result = cursor.fetchone()
        
        if result:
            print(f"[SUCCESS] Verified: {result[0]} | {result[1]} | Max Length: {result[2]} | Nullable: {result[3]}")
        else:
            print("[ERROR] Column not found after migration!")
            return False
        
        cursor.close()
        conn.close()
        
        print("\n" + "=" * 80)
        print("[SUCCESS] Migration complete!")
        print("=" * 80)
        print("\nNext steps:")
        print("   1. Deploy updated backend code")
        print("   2. Deploy updated frontend code")
        print("   3. Test Modern Wizard with 'Requested By' field")
        print()
        
        return True
        
    except psycopg2.Error as e:
        print(f"\n[ERROR] Database error: {e}")
        print("\nTroubleshooting:")
        print("  1. Check your internet connection")
        print("  2. Verify DATABASE_URL is correct")
        print("  3. Check if database is online")
        print("  4. Verify you have ALTER TABLE permissions")
        return False
        
    except Exception as e:
        print(f"\n[ERROR] Unexpected error: {e}")
        return False

if __name__ == '__main__':
    success = run_migration()
    exit(0 if success else 1)

