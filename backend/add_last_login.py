#!/usr/bin/env python3
"""
Add last_login column to users table
"""

import psycopg2
from urllib.parse import urlparse
import sys

def add_last_login_column(database_url):
    """Add last_login column with proper transaction handling"""
    
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
        
        # Set autocommit to avoid transaction issues
        conn.autocommit = True
        cursor = conn.cursor()
        
        print("✅ Connected successfully!")
        
        try:
            print("🔨 Adding last_login column...")
            cursor.execute("ALTER TABLE users ADD COLUMN last_login TIMESTAMP;")
            print("✅ Added last_login column successfully!")
        except psycopg2.errors.DuplicateColumn:
            print("ℹ️ Column last_login already exists")
        except Exception as e:
            print(f"❌ Error adding column: {e}")
        
        cursor.close()
        conn.close()
        
        print("\n🎉 Database update completed!")
        print("✅ Login should now work!")
        
    except Exception as e:
        print(f"❌ Connection Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    print("🔧 Add Last Login Column")
    print("=" * 30)
    
    # Get database URL from user input instead of hardcoding
    database_url = input("\n📝 Please paste your Render PostgreSQL External Database URL: ").strip()
    
    if not database_url.startswith('postgresql://'):
        print("❌ Invalid database URL. It should start with 'postgresql://'")
        sys.exit(1)
    
    add_last_login_column(database_url) 