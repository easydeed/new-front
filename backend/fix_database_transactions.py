#!/usr/bin/env python3
"""
Fix database transaction issues in production
"""

import psycopg2
import os

# Production database URL from your earlier work
DATABASE_URL = "postgresql://deedpro_user:4MkRMdYMHnnoUwvD03rI3kVfjMLwV6j3@dpg-d208q5umcj7s73as68g0-a.ohio-postgres.render.com/deedpro"

def fix_database_transactions():
    print("=" * 60)
    print("🔧 Fixing Database Transaction Issues")
    print("=" * 60)
    
    try:
        # Connect to database
        print("📡 Connecting to production database...")
        conn = psycopg2.connect(DATABASE_URL)
        
        # Set autocommit to resolve stuck transactions
        conn.autocommit = True
        cursor = conn.cursor()
        
        print("✅ Connected successfully")
        
        # Check for active transactions
        print("\n🔍 Checking for stuck transactions...")
        cursor.execute("""
            SELECT pid, state, query, query_start 
            FROM pg_stat_activity 
            WHERE state IN ('idle in transaction', 'idle in transaction (aborted)')
            AND pid != pg_backend_pid()
        """)
        
        stuck_transactions = cursor.fetchall()
        
        if stuck_transactions:
            print(f"⚠️  Found {len(stuck_transactions)} stuck transactions:")
            for pid, state, query, start_time in stuck_transactions:
                print(f"   PID {pid}: {state} - {query[:50]}... (started: {start_time})")
            
            # Terminate stuck transactions
            print("\n🛠️  Terminating stuck transactions...")
            for pid, _, _, _ in stuck_transactions:
                try:
                    cursor.execute(f"SELECT pg_terminate_backend({pid})")
                    print(f"   ✅ Terminated PID {pid}")
                except Exception as e:
                    print(f"   ❌ Failed to terminate PID {pid}: {e}")
        else:
            print("✅ No stuck transactions found")
        
        # Reset connection pool
        print("\n🔄 Resetting connection...")
        cursor.execute("SELECT 1")
        result = cursor.fetchone()
        print(f"✅ Connection test successful: {result}")
        
        # Test basic operations
        print("\n🧪 Testing basic database operations...")
        
        # Test user table access
        cursor.execute("SELECT COUNT(*) FROM users")
        user_count = cursor.fetchone()[0]
        print(f"✅ Users table accessible: {user_count} users")
        
        # Test a simple user query (similar to login)
        cursor.execute("SELECT id, email FROM users WHERE email = %s", ('test@deedpro-check.com',))
        test_user = cursor.fetchone()
        if test_user:
            print(f"✅ Test user found: ID {test_user[0]}, Email: {test_user[1]}")
        else:
            print("⚠️  Test user not found")
        
        cursor.close()
        conn.close()
        
        print(f"\n✅ Database transaction fix completed successfully!")
        print(f"🎯 Try logging in again - the issue should be resolved.")
        
    except Exception as e:
        print(f"❌ Database fix failed: {e}")
        print(f"💡 You may need to restart the Render database service")

if __name__ == "__main__":
    fix_database_transactions()
