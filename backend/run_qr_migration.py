"""
Run QR Verification System migration
Creates document_authenticity and verification_log tables
"""

import psycopg2

DATABASE_URL = "postgresql://mr_staging_db_user:vlFYf9ykajrJC7y62as6RKazBSr37fUU@dpg-d474qiqli9vc738g17e0-a.oregon-postgres.render.com/mr_staging_db"

def run_migration():
    print("Connecting to database...")
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    
    print("Reading migration file...")
    with open('migrations/004_document_authenticity.sql', 'r') as f:
        sql = f.read()
    
    print("Executing migration...")
    cursor.execute(sql)
    conn.commit()
    print("[OK] Migration executed!")
    
    # Verify tables exist
    cursor.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name IN ('document_authenticity', 'verification_log')
    """)
    tables = cursor.fetchall()
    print(f"[OK] Tables created: {[t[0] for t in tables]}")
    
    # Show table columns
    for table in ['document_authenticity', 'verification_log']:
        cursor.execute(f"""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = '{table}'
            ORDER BY ordinal_position
        """)
        cols = cursor.fetchall()
        print(f"\n{table} columns:")
        for col in cols:
            print(f"  - {col[0]}: {col[1]}")
    
    cursor.close()
    conn.close()
    print("\n[SUCCESS] Migration completed successfully!")

if __name__ == "__main__":
    run_migration()
