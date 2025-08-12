#!/usr/bin/env python3

import psycopg2
import os
from dotenv import load_dotenv

def check_database_structure():
    """Check the database structure and existing data"""
    
    DATABASE_URL = 'postgresql://deedpro_user:4MkRMdYMHnnoUwvD03rI3kVfjMLwV6j3@dpg-d208q5umcj7s73as68g0-a.ohio-postgres.render.com/deedpro'
    
    try:
        conn = psycopg2.connect(DATABASE_URL)
        print("✅ Connected to database")
        
        # Check deeds table structure
        with conn.cursor() as cur:
            cur.execute("""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'deeds' 
                ORDER BY ordinal_position;
            """)
            columns = cur.fetchall()
            print('\n📋 Deeds table structure:')
            for col in columns:
                print(f'   {col[0]} ({col[1]})')
                
            # Check if we have any real deeds
            cur.execute('SELECT COUNT(*) FROM deeds')
            count = cur.fetchone()[0]
            print(f'\n📊 Total deeds in database: {count}')
            
            if count > 0:
                cur.execute('SELECT id, deed_type, status, created_at FROM deeds LIMIT 5')
                sample_deeds = cur.fetchall()
                print('\n📄 Sample deeds:')
                for deed in sample_deeds:
                    print(f'   ID {deed[0]}: {deed[1]} - {deed[2]} ({deed[3]})')
            
            # Check users table 
            cur.execute('SELECT COUNT(*) FROM users')
            user_count = cur.fetchone()[0]
            print(f'\n👥 Total users in database: {user_count}')
            
            if user_count > 0:
                cur.execute('SELECT id, email, role, plan FROM users WHERE is_active = TRUE LIMIT 5')
                sample_users = cur.fetchall()
                print('\n👤 Sample users:')
                for user in sample_users:
                    print(f'   ID {user[0]}: {user[1]} - {user[2]} ({user[3]})')
                    
            # Check audit_logs table
            cur.execute("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'audit_logs')")
            has_audit_logs = cur.fetchone()[0]
            if has_audit_logs:
                cur.execute('SELECT COUNT(*) FROM audit_logs')
                audit_count = cur.fetchone()[0]
                print(f'\n📋 Total audit logs: {audit_count}')
                
                if audit_count > 0:
                    cur.execute('SELECT action, timestamp, user_email FROM audit_logs ORDER BY timestamp DESC LIMIT 5')
                    sample_logs = cur.fetchall()
                    print('\n📝 Recent audit logs:')
                    for log in sample_logs:
                        print(f'   {log[0]} by {log[2]} at {log[1]}')
                        
        conn.close()
        print("\n✅ Database check complete")
        
    except Exception as e:
        print(f"❌ Database error: {e}")

if __name__ == "__main__":
    check_database_structure()
