#!/usr/bin/env python3
"""
AdminFix Migration Runner
Grants admin role to test@deedpro-check.com
"""

import psycopg2
import os
from pathlib import Path

# Production database (Ohio)
DATABASE_URL = 'postgresql://deedpro_user:4MkRMdYMHnnoUwvD03rI3kVfjMLwV6j3@dpg-d208q5umcj7s73as68g0-a.ohio-postgres.render.com/deedpro'

def run_migration():
    """Run the admin role migration"""
    try:
        print("🔄 Connecting to production database...")
        conn = psycopg2.connect(DATABASE_URL)
        conn.autocommit = False
        cursor = conn.cursor()
        
        print("📝 Reading migration SQL...")
        sql_file = Path(__file__).parent / 'ADMINFIX_grant_admin_role.sql'
        with open(sql_file, 'r') as f:
            sql = f.read()
        
        print("🚀 Executing admin role grant...")
        
        # Update the user
        cursor.execute("""
            UPDATE users 
            SET role = 'admin' 
            WHERE email = 'test@deedpro-check.com'
            RETURNING id, email, role
        """)
        
        result = cursor.fetchone()
        if result:
            print(f"✅ Admin role granted!")
            print(f"   User ID: {result[0]}")
            print(f"   Email: {result[1]}")
            print(f"   Role: {result[2]}")
        else:
            print("⚠️  No user found with email test@deedpro-check.com")
        
        # Commit the transaction
        conn.commit()
        print("\n✅ Migration completed successfully!")
        print("\n🔑 Next steps:")
        print("   1. Deploy the backend code")
        print("   2. Log out and log back in to get new JWT with admin role")
        print("   3. Access /admin-honest page")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        if conn:
            conn.rollback()
        raise

if __name__ == "__main__":
    run_migration()

