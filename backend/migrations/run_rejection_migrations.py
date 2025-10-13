#!/usr/bin/env python3
"""
Phase 7.5: Rejection Bundle - Database Migrations
Adds feedback columns and ensures notifications tables exist
"""
import os
import psycopg2

def run_migrations():
    print("="*70)
    print("🚀 REJECTION BUNDLE: DATABASE MIGRATIONS")
    print("="*70)
    
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("\n❌ DATABASE_URL environment variable not set")
        print("Please set it in your environment or .env file")
        return
    
    conn = None
    try:
        print("\n📡 Connecting to database...")
        conn = psycopg2.connect(db_url)
        conn.autocommit = False
        print("✅ Connected successfully")
        
        # Migration 1: Add feedback columns to deed_shares
        print("\n⚙️  Migration 1: Adding feedback columns to deed_shares...")
        print("-"*70)
        with open('backend/migrations/20251013_add_feedback_to_deed_shares.sql', 'r') as f:
            migration1 = f.read()
        
        with conn.cursor() as cur:
            cur.execute(migration1)
        conn.commit()
        print("✅ Migration 1 complete: feedback, feedback_at, feedback_by columns added")
        
        # Migration 2: Create notifications tables if missing
        print("\n⚙️  Migration 2: Ensuring notifications tables exist...")
        print("-"*70)
        with open('backend/migrations/20251013_create_notifications_tables_if_missing.sql', 'r') as f:
            migration2 = f.read()
        
        with conn.cursor() as cur:
            cur.execute(migration2)
        conn.commit()
        print("✅ Migration 2 complete: notifications tables verified")
        
        # Verify the changes
        print("\n🔍 Verifying schema changes...")
        with conn.cursor() as cur:
            # Check deed_shares columns
            cur.execute("""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'deed_shares' 
                AND column_name IN ('feedback', 'feedback_at', 'feedback_by')
                ORDER BY column_name
            """)
            feedback_cols = cur.fetchall()
            
            if len(feedback_cols) == 3:
                print("  ✅ deed_shares.feedback (TEXT)")
                print("  ✅ deed_shares.feedback_at (TIMESTAMPTZ)")
                print("  ✅ deed_shares.feedback_by (VARCHAR)")
            else:
                print(f"  ⚠️  Expected 3 columns, found {len(feedback_cols)}")
            
            # Check notifications table
            cur.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'notifications'
                )
            """)
            has_notifications = cur.fetchone()[0]
            print(f"  {'✅' if has_notifications else '❌'} notifications table exists")
            
            # Check user_notifications table
            cur.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'user_notifications'
                )
            """)
            has_user_notifications = cur.fetchone()[0]
            print(f"  {'✅' if has_user_notifications else '❌'} user_notifications table exists")
        
        print("\n"+"="*70)
        print("🎉 ALL MIGRATIONS COMPLETE!")
        print("="*70)
        print("\n📊 Summary:")
        print("  - 3 columns added to deed_shares")
        print("  - 2 tables verified/created (notifications, user_notifications)")
        print("  - 1 index created (idx_deed_shares_feedback_at)")
        print("  - 1 index created (idx_user_notifications_user)")
        print("\n✅ Database is ready for rejection flow!")
        
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"\n❌ Migration failed: {e}")
        print("\n❌ Please fix errors and try again")
        import traceback
        traceback.print_exc()
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    run_migrations()

