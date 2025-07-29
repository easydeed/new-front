#!/usr/bin/env python3
"""
Fix Database Schema - Add Missing Columns
"""

import psycopg2
from urllib.parse import urlparse
import sys

def fix_database_schema(database_url):
    """Add missing columns to users table"""
    
    print("🔗 Connecting to database...")
    
    try:
        # Parse the database URL
        result = urlparse(database_url)
        
        # Connect to database
        conn = psycopg2.connect(
            database=result.path[1:],
            user=result.username,
            password=result.password,
            host=result.hostname,
            port=result.port
        )
        
        cursor = conn.cursor()
        print("✅ Connected successfully!")
        
        # Add missing columns one by one
        missing_columns = [
            ("role", "VARCHAR(50) DEFAULT 'User'"),
            ("company_name", "VARCHAR(255)"),
            ("company_type", "VARCHAR(100)"),
            ("phone", "VARCHAR(20)"),
            ("state", "VARCHAR(2)"),
            ("subscribe", "BOOLEAN DEFAULT FALSE"),
            ("verified", "BOOLEAN DEFAULT FALSE")
        ]
        
        for column_name, column_def in missing_columns:
            try:
                print(f"🔨 Adding column: {column_name}")
                cursor.execute(f"ALTER TABLE users ADD COLUMN {column_name} {column_def};")
                print(f"✅ Added {column_name}")
            except psycopg2.errors.DuplicateColumn:
                print(f"ℹ️ Column {column_name} already exists")
                conn.rollback()  # Rollback the failed transaction
            except Exception as e:
                print(f"❌ Error adding {column_name}: {e}")
                conn.rollback()
        
        # Commit all successful changes
        conn.commit()
        cursor.close()
        conn.close()
        
        print("\n🎉 Database schema fixed successfully!")
        print("✅ Registration should now work!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    print("🔧 DeedPro Database Schema Fix")
    print("=" * 50)
    
    # Get database URL from user
    database_url = input("\n📝 Please paste your Render PostgreSQL External Database URL: ").strip()
    
    if not database_url.startswith('postgresql://'):
        print("❌ Invalid database URL. It should start with 'postgresql://'")
        sys.exit(1)
    
    fix_database_schema(database_url) 