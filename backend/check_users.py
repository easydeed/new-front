#!/usr/bin/env python3
"""
Check Test Users Script for DeedPro
"""

import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

def check_database_users():
    """Check the database for existing users"""
    
    # Connect to database
    db_url = os.getenv('DATABASE_URL')
    if not db_url:
        print('❌ No DATABASE_URL found in environment')
        return False
    
    try:
        conn = psycopg2.connect(db_url)
        cursor = conn.cursor()
        
        print('✅ Connected to database successfully')
        
        # Check users table structure
        cursor.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'users' AND table_schema = 'public'
            ORDER BY ordinal_position;
        """)
        
        columns = cursor.fetchall()
        print(f'\n📋 Users table structure ({len(columns)} columns):')
        for col in columns:
            nullable = "NULL" if col[2] == "YES" else "NOT NULL"
            print(f'  - {col[0]}: {col[1]} ({nullable})')
        
        # Check if we have any users
        cursor.execute('SELECT COUNT(*) FROM users;')
        user_count = cursor.fetchone()[0]
        print(f'\n👥 Total users in database: {user_count}')
        
        if user_count > 0:
            # Show sample users (without sensitive data)
            cursor.execute("""
                SELECT id, email, full_name, role, plan, created_at, is_active
                FROM users 
                ORDER BY created_at DESC 
                LIMIT 10;
            """)
            
            users = cursor.fetchall()
            print(f'\n📋 Recent users:')
            for user in users:
                active_status = user[6] if len(user) > 6 else 'Unknown'
                print(f'  ID: {user[0]} | {user[1]} | {user[2] or "N/A"} | {user[3] or "N/A"} | Plan: {user[4]} | Active: {active_status}')
        
        # Check for specific test emails if you have any
        test_emails = ['test@example.com', 'admin@deedpro.com', 'demo@deedpro.com']
        for email in test_emails:
            cursor.execute('SELECT id, email, full_name, role, plan FROM users WHERE email = %s;', (email,))
            user = cursor.fetchone()
            if user:
                print(f'\n🎯 Found test user: {user[1]} (ID: {user[0]}, Role: {user[3]}, Plan: {user[4]})')
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f'❌ Database error: {e}')
        return False

if __name__ == "__main__":
    check_database_users()
