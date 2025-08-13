#!/usr/bin/env python3
"""
Add property cache table for TitlePoint integration
"""
import os
import sys
import psycopg2
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def get_db_connection():
    """Get database connection"""
    db_url = os.getenv("DATABASE_URL") or os.getenv("DB_URL")
    if not db_url:
        print("❌ No database URL found in environment variables")
        return None
    
    try:
        return psycopg2.connect(db_url)
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return None

def create_property_cache_table():
    """Create property cache table if it doesn't exist"""
    conn = get_db_connection()
    if not conn:
        return False
    
    try:
        cursor = conn.cursor()
        
        # Create property_cache table for TitlePoint data caching
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS property_cache (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                address TEXT NOT NULL,
                data JSONB NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, address)
            );
        """)
        
        # Create index for faster lookups
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_property_cache_user_address 
            ON property_cache(user_id, address);
        """)
        
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_property_cache_created_at 
            ON property_cache(created_at);
        """)
        
        conn.commit()
        print("✅ Property cache table created successfully")
        return True
        
    except psycopg2.Error as e:
        print(f"❌ Error creating property cache table: {e}")
        conn.rollback()
        return False
    finally:
        cursor.close()
        conn.close()

def main():
    """Main function"""
    print("🔧 Setting up property cache table for TitlePoint integration...")
    
    if create_property_cache_table():
        print("✅ Property cache setup completed successfully!")
        print("\n📋 Table created:")
        print("   - property_cache: Stores TitlePoint lookup results for 24-hour caching")
        print("\n🚀 TitlePoint integration database setup is complete!")
    else:
        print("❌ Property cache setup failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()
