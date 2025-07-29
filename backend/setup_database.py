#!/usr/bin/env python3
"""
Simple Database Setup Script for DeedPro
Run this locally to initialize your Render PostgreSQL database
"""

import psycopg2
from urllib.parse import urlparse
import sys

def setup_database(database_url):
    """Initialize the database with required tables and test data"""
    
    print("🔗 Connecting to database...")
    
    try:
        # Parse the database URL
        result = urlparse(database_url)
        
        # Connect to database
        conn = psycopg2.connect(
            database=result.path[1:],
            user=result.username,
            password=result.password,
            host=result.hostname,
            port=result.port
        )
        
        cursor = conn.cursor()
        print("✅ Connected successfully!")
        
        # Drop existing tables if they exist (clean slate)
        print("🗑️ Cleaning existing tables...")
        cursor.execute('DROP TABLE IF EXISTS shared_deeds CASCADE;')
        cursor.execute('DROP TABLE IF EXISTS deeds CASCADE;')
        cursor.execute('DROP TABLE IF EXISTS users CASCADE;')
        
        # Create users table with all required columns
        print("🔨 Creating users table...")
        cursor.execute('''
            CREATE TABLE users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                full_name VARCHAR(255) NOT NULL,
                plan VARCHAR(50) DEFAULT 'Free',
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                deeds_count INTEGER DEFAULT 0,
                api_calls_count INTEGER DEFAULT 0
            );
        ''')
        
        # Create deeds table
        print("🔨 Creating deeds table...")
        cursor.execute('''
            CREATE TABLE deeds (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                deed_type VARCHAR(100) NOT NULL,
                property_address TEXT NOT NULL,
                grantor_name VARCHAR(255) NOT NULL,
                grantee_name VARCHAR(255) NOT NULL,
                legal_description TEXT,
                status VARCHAR(50) DEFAULT 'draft',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        ''')
        
        # Create shared_deeds table
        print("🔨 Creating shared_deeds table...")
        cursor.execute('''
            CREATE TABLE shared_deeds (
                id SERIAL PRIMARY KEY,
                deed_id INTEGER REFERENCES deeds(id),
                recipient_email VARCHAR(255) NOT NULL,
                recipient_name VARCHAR(255),
                message TEXT,
                status VARCHAR(50) DEFAULT 'pending',
                approval_token VARCHAR(255) UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                approved_at TIMESTAMP
            );
        ''')
        
        # Insert test users with hashed passwords
        print("👥 Creating test users...")
        
        # Simple password hashing (using a basic method for this setup)
        import hashlib
        
        test_users = [
            {
                'email': 'test@escrow.com',
                'password': 'testpass123',
                'full_name': 'Test User',
                'plan': 'Free'
            },
            {
                'email': 'pro@title.com', 
                'password': 'propass123',
                'full_name': 'Pro User',
                'plan': 'Professional'
            },
            {
                'email': 'admin@deedpro.com',
                'password': 'adminpass123', 
                'full_name': 'Admin User',
                'plan': 'Enterprise'
            }
        ]
        
        for user in test_users:
            # Simple hash for demo (in production, use bcrypt)
            password_hash = hashlib.sha256(user['password'].encode()).hexdigest()
            
            cursor.execute('''
                INSERT INTO users (email, password_hash, full_name, plan)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (email) DO UPDATE SET
                    password_hash = EXCLUDED.password_hash,
                    full_name = EXCLUDED.full_name,
                    plan = EXCLUDED.plan
            ''', (user['email'], password_hash, user['full_name'], user['plan']))
        
        # Commit all changes
        conn.commit()
        cursor.close()
        conn.close()
        
        print("\n🎉 Database setup completed successfully!")
        print("\n📋 Test accounts created:")
        print("   • Free Plan: test@escrow.com (password: testpass123)")
        print("   • Professional: pro@title.com (password: propass123)")  
        print("   • Enterprise: admin@deedpro.com (password: adminpass123)")
        print("\n✅ Your DeedPro backend is ready!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    print("🚀 DeedPro Database Setup")
    print("=" * 50)
    
    # Get database URL from user
    database_url = input("\n📝 Please paste your Render PostgreSQL External Database URL: ").strip()
    
    if not database_url.startswith('postgresql://'):
        print("❌ Invalid database URL. It should start with 'postgresql://'")
        sys.exit(1)
    
    setup_database(database_url) 