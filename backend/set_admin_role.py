"""Quick script to set admin role for a user"""
import psycopg2
import sys

DATABASE_URL = "postgresql://mr_staging_db_user:vlFYf9ykajrJC7y62as6RKazBSr37fUU@dpg-d474qiqli9vc738g17e0-a.oregon-postgres.render.com/mr_staging_db"

def main():
    print("Connecting to database...")
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    
    # First, check what columns exist in users table
    cursor.execute("""
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name IN ('role', 'is_platform_admin')
    """)
    columns = [row[0] for row in cursor.fetchall()]
    print(f"Available admin columns: {columns}")
    
    # Check current users
    print("\nCurrent users:")
    cursor.execute("SELECT id, email, role FROM users ORDER BY created_at DESC LIMIT 5")
    for row in cursor.fetchall():
        print(f"  {row}")
    
    # Update role for the user
    email = input("\nEnter email to make admin (or press Enter for 'g@g.com'): ").strip()
    if not email:
        email = "g@g.com"
    
    # Check if user exists
    cursor.execute("SELECT id, email, role FROM users WHERE email = %s", (email,))
    user = cursor.fetchone()
    
    if not user:
        print(f"User {email} not found!")
        # Try to find similar
        cursor.execute("SELECT email FROM users WHERE email ILIKE %s", (f"%{email.split('@')[0]}%",))
        similar = cursor.fetchall()
        if similar:
            print(f"Similar users: {[r[0] for r in similar]}")
        conn.close()
        return
    
    print(f"\nFound user: id={user[0]}, email={user[1]}, role={user[2]}")
    
    # Update to admin
    if 'role' in columns:
        cursor.execute("UPDATE users SET role = 'admin' WHERE email = %s", (email,))
        conn.commit()
        print(f"Updated role to 'admin' for {email}")
    
    if 'is_platform_admin' in columns:
        cursor.execute("UPDATE users SET is_platform_admin = true WHERE email = %s", (email,))
        conn.commit()
        print(f"Set is_platform_admin = true for {email}")
    
    # Verify
    cursor.execute("SELECT id, email, role FROM users WHERE email = %s", (email,))
    updated = cursor.fetchone()
    print(f"\nVerified: {updated}")
    
    cursor.close()
    conn.close()
    print("\nDone! Log out and log back in to get new JWT.")

if __name__ == "__main__":
    main()
