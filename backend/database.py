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
        
        # Create user_profiles table for AI-enhanced defaults
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_profiles (
                user_id INTEGER PRIMARY KEY REFERENCES users(id),
                company_name VARCHAR(255),
                business_address TEXT,
                license_number VARCHAR(50),
                role VARCHAR(50) DEFAULT 'escrow_officer',
                default_county VARCHAR(100),
                notary_commission_exp DATE,
                preferred_deed_type VARCHAR(50) DEFAULT 'grant_deed',
                auto_populate_company_info BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create property_cache table for intelligent suggestions
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS property_cache (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                property_address TEXT NOT NULL,
                legal_description TEXT,
                apn VARCHAR(50),
                county VARCHAR(100),
                city VARCHAR(100),
                state VARCHAR(10),
                zip_code VARCHAR(10),
                lookup_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, property_address)
            )
        """)
        
        # Create user_preferences table for workflow customization
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_preferences (
                user_id INTEGER PRIMARY KEY REFERENCES users(id),
                default_recording_office VARCHAR(255),
                standard_disclaimers TEXT,
                enable_ai_suggestions BOOLEAN DEFAULT TRUE,
                preferred_templates TEXT, -- JSON for template customizations
                notification_preferences TEXT, -- JSON for notification settings
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create property_cache table for TitlePoint data caching
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS property_cache (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                address TEXT NOT NULL,
                state VARCHAR(2),
                county TEXT,
                cached_data JSONB NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '90 days'),
                UNIQUE(user_id, address, state, county)
            )
        """)
        
        # Create indexes for property_cache for faster lookups
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_property_cache_lookup 
            ON property_cache(user_id, address, state, county)
        """)
        
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_property_cache_expires 
            ON property_cache(expires_at)
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

# User profile functions
def get_user_profile(user_id):
    """Get user profile data for AI suggestions"""
    conn = get_db_connection()
    if not conn:
        return None
    
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT company_name, business_address, license_number, role, 
                   default_county, preferred_deed_type, auto_populate_company_info
            FROM user_profiles WHERE user_id = %s
        """, (user_id,))
        profile = cursor.fetchone()
        cursor.close()
        conn.close()
        return dict(profile) if profile else None
    except Exception as e:
        print(f"Error getting user profile: {e}")
        if conn:
            conn.close()
        return None

def update_user_profile(user_id, profile_data):
    """Update or create user profile for AI defaults"""
    conn = get_db_connection()
    if not conn:
        return False
    
    try:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO user_profiles (user_id, company_name, business_address, 
                                     license_number, role, default_county, 
                                     preferred_deed_type, auto_populate_company_info)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (user_id) 
            DO UPDATE SET 
                company_name = EXCLUDED.company_name,
                business_address = EXCLUDED.business_address,
                license_number = EXCLUDED.license_number,
                role = EXCLUDED.role,
                default_county = EXCLUDED.default_county,
                preferred_deed_type = EXCLUDED.preferred_deed_type,
                auto_populate_company_info = EXCLUDED.auto_populate_company_info,
                updated_at = CURRENT_TIMESTAMP
        """, (
            user_id,
            profile_data.get('company_name'),
            profile_data.get('business_address'),
            profile_data.get('license_number'),
            profile_data.get('role', 'escrow_officer'),
            profile_data.get('default_county'),
            profile_data.get('preferred_deed_type', 'grant_deed'),
            profile_data.get('auto_populate_company_info', True)
        ))
        conn.commit()
        cursor.close()
        conn.close()
        return True
    except Exception as e:
        print(f"Error updating user profile: {e}")
        if conn:
            conn.close()
        return False

# Property cache functions
def get_cached_property(user_id, address):
    """Get cached property data for suggestions"""
    conn = get_db_connection()
    if not conn:
        return None
    
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT property_address, legal_description, apn, county, city, state, zip_code
            FROM property_cache 
            WHERE user_id = %s AND property_address ILIKE %s
            ORDER BY lookup_date DESC LIMIT 1
        """, (user_id, f"%{address}%"))
        property_data = cursor.fetchone()
        cursor.close()
        conn.close()
        return dict(property_data) if property_data else None
    except Exception as e:
        print(f"Error getting cached property: {e}")
        if conn:
            conn.close()
        return None

def cache_property_data(user_id, property_data):
    """Cache property data for future suggestions"""
    conn = get_db_connection()
    if not conn:
        return False
    
    try:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO property_cache (user_id, property_address, legal_description, 
                                      apn, county, city, state, zip_code)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (user_id, property_address)
            DO UPDATE SET 
                legal_description = EXCLUDED.legal_description,
                apn = EXCLUDED.apn,
                county = EXCLUDED.county,
                city = EXCLUDED.city,
                state = EXCLUDED.state,
                zip_code = EXCLUDED.zip_code,
                lookup_date = CURRENT_TIMESTAMP
        """, (
            user_id,
            property_data.get('property_address'),
            property_data.get('legal_description'),
            property_data.get('apn'),
            property_data.get('county'),
            property_data.get('city'),
            property_data.get('state'),
            property_data.get('zip_code')
        ))
        conn.commit()
        cursor.close()
        conn.close()
        return True
    except Exception as e:
        print(f"Error caching property data: {e}")
        if conn:
            conn.close()
        return False

def get_recent_properties(user_id, limit=5):
    """Get user's recent property searches for suggestions"""
    conn = get_db_connection()
    if not conn:
        return []
    
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT property_address, legal_description, county, city
            FROM property_cache 
            WHERE user_id = %s
            ORDER BY lookup_date DESC LIMIT %s
        """, (user_id, limit))
        properties = cursor.fetchall()
        cursor.close()
        conn.close()
        return [dict(prop) for prop in properties] if properties else []
    except Exception as e:
        print(f"Error getting recent properties: {e}")
        if conn:
            conn.close()
        return []

# Initialize database tables on module import
if DATABASE_URL:
    create_tables()
else:
    print("Warning: DATABASE_URL environment variable not set") 