import os
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()

# Get the database URL from environment variable
DATABASE_URL = os.getenv("DATABASE_URL")

def get_db_connection():
    try:
        conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
        return conn
    except Exception as e:
        print(f"Database connection error: {e}")
        return None

def create_tables():
    conn = get_db_connection()
    if not conn:
        return False
    
    try:
        cursor = conn.cursor()
        
        # Create users table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                first_name VARCHAR(100),
                last_name VARCHAR(100),
                username VARCHAR(100) UNIQUE,
                city VARCHAR(100),
                country VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create deeds table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS deeds (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                deed_type VARCHAR(100),
                property_address TEXT,
                apn VARCHAR(50),
                county VARCHAR(100),
                legal_description TEXT,
                owner_type VARCHAR(100),
                sales_price DECIMAL(15,2),
                grantee_name VARCHAR(255),
                vesting VARCHAR(255),
                status VARCHAR(50) DEFAULT 'draft',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create payment_methods table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS payment_methods (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                stripe_payment_method_id VARCHAR(100),
                card_brand VARCHAR(50),
                last_four VARCHAR(4),
                is_default BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        conn.commit()
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"Error creating tables: {e}")
        if conn:
            conn.close()
        return False

# User functions
def create_user(email, first_name, last_name, username=None, city=None, country=None):
    conn = get_db_connection()
    if not conn:
        return None
    
    try:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO users (email, first_name, last_name, username, city, country)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING *
        """, (email, first_name, last_name, username, city, country))
        
        user = cursor.fetchone()
        conn.commit()
        cursor.close()
        conn.close()
        return dict(user) if user else None
        
    except Exception as e:
        print(f"Error creating user: {e}")
        if conn:
            conn.close()
        return None

def get_user_by_email(email):
    conn = get_db_connection()
    if not conn:
        return None
    
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
        user = cursor.fetchone()
        cursor.close()
        conn.close()
        return dict(user) if user else None
        
    except Exception as e:
        print(f"Error getting user: {e}")
        if conn:
            conn.close()
        return None

# Deed functions
def create_deed(user_id, deed_data):
    conn = get_db_connection()
    if not conn:
        return None
    
    try:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO deeds (user_id, deed_type, property_address, apn, county, 
                             legal_description, owner_type, sales_price, grantee_name, vesting)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
        """, (
            user_id, 
            deed_data.get('deed_type'),
            deed_data.get('property_address'),
            deed_data.get('apn'),
            deed_data.get('county'),
            deed_data.get('legal_description'),
            deed_data.get('owner_type'),
            deed_data.get('sales_price'),
            deed_data.get('grantee_name'),
            deed_data.get('vesting')
        ))
        
        deed = cursor.fetchone()
        conn.commit()
        cursor.close()
        conn.close()
        return dict(deed) if deed else None
        
    except Exception as e:
        print(f"Error creating deed: {e}")
        if conn:
            conn.close()
        return None

def get_user_deeds(user_id):
    conn = get_db_connection()
    if not conn:
        return []
    
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM deeds WHERE user_id = %s ORDER BY created_at DESC", (user_id,))
        deeds = cursor.fetchall()
        cursor.close()
        conn.close()
        return [dict(deed) for deed in deeds] if deeds else []
        
    except Exception as e:
        print(f"Error getting user deeds: {e}")
        if conn:
            conn.close()
        return []

# Initialize database tables on module import
if DATABASE_URL:
    create_tables()
else:
    print("Warning: DATABASE_URL environment variable not set") 