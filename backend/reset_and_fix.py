#!/usr/bin/env python3
"""
Reset Database Connection and Add Missing Columns
"""

import psycopg2
from urllib.parse import urlparse
import sys
import time

def reset_and_fix_database(database_url):
    """Reset connection and add missing columns"""
    
    print("🔄 Resetting database connection...")
    
    # Try multiple connection attempts
    for attempt in range(3):
        try:
            print(f"🔗 Connection attempt {attempt + 1}...")
            
            # Parse the database URL
            result = urlparse(database_url)
            
            # Create fresh connection
            conn = psycopg2.connect(
                database=result.path[1:],
                user=result.username,
                password=result.password,
                host=result.hostname,
                port=result.port,
                connect_timeout=10
            )
            
            # Critical: Set autocommit immediately
            conn.autocommit = True
            
            cursor = conn.cursor()
            print("✅ Connected successfully!")
            
            # Force rollback any pending transactions
            try:
                cursor.execute("ROLLBACK;")
            except:
                pass  # Ignore if no transaction
            
            # Check current table structure
            print("🔍 Checking current table structure...")
            cursor.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'users' AND table_schema = 'public';
            """)
            
            existing_columns = [row[0] for row in cursor.fetchall()]
            print(f"📋 Existing columns: {existing_columns}")
            
            # Add missing columns
            missing_columns = [
                ("last_login", "TIMESTAMP"),
                ("subscription_id", "VARCHAR(255)"),
                ("stripe_customer_id", "VARCHAR(255)")
            ]
            
            for column_name, column_type in missing_columns:
                if column_name not in existing_columns:
                    try:
                        print(f"🔨 Adding column: {column_name}")
                        cursor.execute(f"ALTER TABLE users ADD COLUMN {column_name} {column_type};")
                        print(f"✅ Added {column_name}")
                        time.sleep(1)  # Give database time to process
                    except Exception as e:
                        print(f"⚠️ Could not add {column_name}: {e}")
                else:
                    print(f"ℹ️ Column {column_name} already exists")
            
            cursor.close()
            conn.close()
            
            print("\n🎉 Database reset and update completed!")
            print("✅ Login should now work!")
            return True
            
        except Exception as e:
            print(f"❌ Attempt {attempt + 1} failed: {e}")
            if attempt < 2:
                print("⏳ Waiting 5 seconds before retry...")
                time.sleep(5)
            else:
                print("❌ All connection attempts failed")
                return False
    
    return False

if __name__ == "__main__":
    print("🔄 Database Connection Reset & Fix")
    print("=" * 40)
    
    # Get database URL from user input instead of hardcoding
    database_url = input("\n📝 Please paste your Render PostgreSQL External Database URL: ").strip()
    
    if not database_url.startswith('postgresql://'):
        print("❌ Invalid database URL. It should start with 'postgresql://'")
        sys.exit(1)
    
    success = reset_and_fix_database(database_url)
    
    if success:
        print("\n🎯 Next steps:")
        print("1. Wait 30 seconds")
        print("2. Try logging in again") 
        print("3. If still fails, restart your Render backend service")
    else:
        print("\n⚠️ Manual intervention needed")
        print("Go to Render dashboard and restart your backend service") 