#!/usr/bin/env python3
"""
Quick fix: Set password for gerardoh@gmail.com (User #5)
Password: Test123!
"""

import os
import sys
import psycopg2
from db_rows import ROW_FACTORY
from passlib.hash import bcrypt

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def set_user5_password():
    """Set password for gerardoh@gmail.com"""
    
    database_url = os.getenv('DATABASE_URL')
    
    if not database_url:
        print("❌ DATABASE_URL not set")
        print("Set it first, then run this script")
        return False
    
    print("=" * 60)
    print("🔧 FIXING USER #5 PASSWORD")
    print("=" * 60)
    print()
    
    try:
        # Connect
        print("📡 Connecting to database...")
        conn = psycopg2.connect(database_url, cursor_factory=ROW_FACTORY)
        cursor = conn.cursor()
        print("✅ Connected")
        print()
        
        # Check if user exists
        print("🔍 Looking for gerardoh@gmail.com...")
        cursor.execute("SELECT id, email, full_name FROM users WHERE email = %s", ('gerardoh@gmail.com',))
        user = cursor.fetchone()
        
        if not user:
            print("❌ User not found!")
            print("Available users:")
            cursor.execute("SELECT id, email FROM users ORDER BY id")
            for row in cursor.fetchall():
                print(f"  - User #{row[0]}: {row[1]}")
            return False
        
        user_id, email, name = user['id'], user['email'], user['full_name']
        print(f"✅ Found: User #{user_id} - {name} ({email})")
        print()
        
        # Hash password
        password = "Test123!"
        print(f"🔐 Hashing password: {password}")
        hashed = bcrypt.hash(password)
        print(f"✅ Hashed: {hashed[:50]}...")
        print()
        
        # Update
        print("💾 Updating password in database...")
        cursor.execute("""
            UPDATE users 
            SET password_hash = %s 
            WHERE id = %s
        """, (hashed, user_id))
        
        conn.commit()
        print("✅ Password updated successfully!")
        print()
        
        # Verify
        print("🔍 Verifying...")
        cursor.execute("SELECT password_hash FROM users WHERE id = %s", (user_id,))
        new_hash = cursor.fetchone()[0]
        
        if bcrypt.verify(password, new_hash):
            print("✅ VERIFICATION PASSED!")
            print()
            print("=" * 60)
            print("🎉 SUCCESS!")
            print("=" * 60)
            print()
            print(f"Email:    {email}")
            print(f"Password: {password}")
            print()
            print("✅ You can now login!")
            return True
        else:
            print("❌ VERIFICATION FAILED!")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

if __name__ == '__main__':
    success = set_user5_password()
    sys.exit(0 if success else 1)

