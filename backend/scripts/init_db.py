import psycopg2
from dotenv import load_dotenv
import os
from passlib.context import CryptContext

# Load environment variables
load_dotenv()

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def init_database():
    """Initialize the database with required tables and seed data"""
    try:
        # Connect to database
        db_url = os.getenv("DATABASE_URL") or os.getenv("DB_URL")
        if not db_url:
            print("❌ Error: DATABASE_URL or DB_URL not found in environment variables")
            return False
            
        conn = psycopg2.connect(db_url)
        print("✅ Connected to database successfully")
        
        with conn.cursor() as cur:
            # Enhanced users table with plan management and Stripe integration
            print("📋 Creating users table...")
            cur.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    password_hash VARCHAR(255) NOT NULL,
                    full_name VARCHAR(255) NOT NULL,
                    role VARCHAR(50) NOT NULL,
                    company_name VARCHAR(255),
                    company_type VARCHAR(50),
                    phone VARCHAR(20),
                    state CHAR(2) NOT NULL,
                    subscribe BOOLEAN DEFAULT FALSE,
                    plan VARCHAR(50) DEFAULT 'free',
                    stripe_customer_id VARCHAR(255),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    verified BOOLEAN DEFAULT FALSE,
                    last_login TIMESTAMP,
                    is_active BOOLEAN DEFAULT TRUE
                );
            """)
            
            # Create index for faster email lookups
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
            """)
            
            # Create index for plan filtering
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_users_plan ON users(plan);
            """)
            
            # Deeds table (if not exists) with user relationship
            print("📋 Creating deeds table...")
            cur.execute("""
                CREATE TABLE IF NOT EXISTS deeds (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    deed_type VARCHAR(100) NOT NULL,
                    property_address TEXT NOT NULL,
                    grantor_name VARCHAR(255) NOT NULL,
                    grantee_name VARCHAR(255) NOT NULL,
                    legal_description TEXT,
                    consideration_amount DECIMAL(12,2),
                    status VARCHAR(50) DEFAULT 'draft',
                    ai_assisted BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    completed_at TIMESTAMP
                );
            """)
            
            # Create index for user deed lookups
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_deeds_user_id ON deeds(user_id);
            """)
            
            # Create index for monthly deed counting
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_deeds_created_at ON deeds(created_at);
            """)
            
            # Subscriptions table for Stripe integration
            print("📋 Creating subscriptions table...")
            cur.execute("""
                CREATE TABLE IF NOT EXISTS subscriptions (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    stripe_subscription_id VARCHAR(255) UNIQUE,
                    status VARCHAR(50) NOT NULL,
                    current_period_start TIMESTAMP,
                    current_period_end TIMESTAMP,
                    plan_name VARCHAR(50) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            
            # API usage tracking table
            print("📋 Creating api_usage table...")
            cur.execute("""
                CREATE TABLE IF NOT EXISTS api_usage (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    endpoint VARCHAR(255) NOT NULL,
                    method VARCHAR(10) NOT NULL,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    response_time_ms INTEGER,
                    status_code INTEGER,
                    ip_address INET
                );
            """)
            
            # Plan limits configuration table
            print("📋 Creating plan_limits table...")
            cur.execute("""
                CREATE TABLE IF NOT EXISTS plan_limits (
                    id SERIAL PRIMARY KEY,
                    plan_name VARCHAR(50) UNIQUE NOT NULL,
                    max_deeds_per_month INTEGER,
                    api_calls_per_month INTEGER,
                    ai_assistance BOOLEAN DEFAULT TRUE,
                    integrations_enabled BOOLEAN DEFAULT FALSE,
                    priority_support BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            
            conn.commit()
            print("✅ All tables created successfully")
            
            # Seed plan limits data
            print("🌱 Seeding plan limits...")
            cur.execute("""
                INSERT INTO plan_limits (plan_name, max_deeds_per_month, api_calls_per_month, ai_assistance, integrations_enabled, priority_support)
                VALUES 
                ('free', 5, 100, TRUE, FALSE, FALSE),
                ('professional', -1, 1000, TRUE, TRUE, FALSE),
                ('enterprise', -1, 10000, TRUE, TRUE, TRUE)
                ON CONFLICT (plan_name) DO UPDATE SET
                    max_deeds_per_month = EXCLUDED.max_deeds_per_month,
                    api_calls_per_month = EXCLUDED.api_calls_per_month,
                    ai_assistance = EXCLUDED.ai_assistance,
                    integrations_enabled = EXCLUDED.integrations_enabled,
                    priority_support = EXCLUDED.priority_support;
            """)
            
            # Seed test users
            print("🌱 Seeding test users...")
            test_users = [
                {
                    'email': 'test@escrow.com',
                    'password': 'testpass123',
                    'full_name': 'John Doe',
                    'role': 'Escrow Officer',
                    'company_name': 'Independent Escrow',
                    'company_type': 'Independent Escrow Company',
                    'phone': '555-0123',
                    'state': 'CA',
                    'subscribe': True,
                    'plan': 'free'
                },
                {
                    'email': 'pro@title.com',
                    'password': 'propass123',
                    'full_name': 'Jane Professional',
                    'role': 'Title Agent',
                    'company_name': 'Pro Title Company',
                    'company_type': 'Title Company',
                    'phone': '555-0456',
                    'state': 'TX',
                    'subscribe': False,
                    'plan': 'professional'
                },
                {
                    'email': 'admin@deedpro.com',
                    'password': 'adminpass123',
                    'full_name': 'Admin User',
                    'role': 'Administrator',
                    'company_name': 'DeedPro',
                    'company_type': 'Technology Company',
                    'phone': '555-0789',
                    'state': 'CA',
                    'subscribe': True,
                    'plan': 'enterprise'
                }
            ]
            
            for user in test_users:
                password_hash = pwd_context.hash(user['password'])
                cur.execute("""
                    INSERT INTO users (email, password_hash, full_name, role, company_name, company_type, phone, state, subscribe, plan, verified)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, TRUE)
                    ON CONFLICT (email) DO UPDATE SET
                        password_hash = EXCLUDED.password_hash,
                        full_name = EXCLUDED.full_name,
                        plan = EXCLUDED.plan,
                        verified = TRUE;
                """, (
                    user['email'], password_hash, user['full_name'], user['role'],
                    user['company_name'], user['company_type'], user['phone'],
                    user['state'], user['subscribe'], user['plan']
                ))
            
            # Seed some test deeds for the users
            print("🌱 Seeding test deeds...")
            cur.execute("""
                WITH user_ids AS (
                    SELECT id, email FROM users WHERE email IN ('test@escrow.com', 'pro@title.com')
                )
                INSERT INTO deeds (user_id, deed_type, property_address, grantor_name, grantee_name, legal_description, consideration_amount, status, ai_assisted)
                SELECT 
                    u.id,
                    deed_data.deed_type,
                    deed_data.property_address,
                    deed_data.grantor_name,
                    deed_data.grantee_name,
                    deed_data.legal_description,
                    deed_data.consideration_amount,
                    deed_data.status,
                    deed_data.ai_assisted
                FROM user_ids u
                CROSS JOIN (
                    VALUES 
                        ('Grant Deed', '123 Main St, Los Angeles, CA 90210', 'John Smith', 'Jane Doe', 'Lot 1, Block A, Subdivision XYZ', 500000.00, 'completed', TRUE),
                        ('Quitclaim Deed', '456 Oak Ave, Sacramento, CA 95814', 'Bob Johnson', 'Alice Brown', 'Parcel 123-456-789', 0.00, 'draft', FALSE),
                        ('Warranty Deed', '789 Pine Blvd, San Francisco, CA 94102', 'Mike Wilson', 'Sarah Davis', 'Unit 5, Condominium Complex ABC', 750000.00, 'completed', TRUE)
                ) AS deed_data(deed_type, property_address, grantor_name, grantee_name, legal_description, consideration_amount, status, ai_assisted)
                WHERE u.email = 'test@escrow.com'
                
                UNION ALL
                
                SELECT 
                    u.id,
                    deed_data.deed_type,
                    deed_data.property_address,
                    deed_data.grantor_name,
                    deed_data.grantee_name,
                    deed_data.legal_description,
                    deed_data.consideration_amount,
                    deed_data.status,
                    deed_data.ai_assisted
                FROM user_ids u
                CROSS JOIN (
                    VALUES 
                        ('Special Warranty Deed', '321 Elm St, Austin, TX 78701', 'Robert Taylor', 'Jennifer Clark', 'Tract 789, County Records', 650000.00, 'completed', TRUE)
                ) AS deed_data(deed_type, property_address, grantor_name, grantee_name, legal_description, consideration_amount, status, ai_assisted)
                WHERE u.email = 'pro@title.com'
                ON CONFLICT DO NOTHING;
            """)
            
            conn.commit()
            print("✅ Test data seeded successfully")
            
            # Display summary
            cur.execute("SELECT COUNT(*) FROM users;")
            user_count = cur.fetchone()[0]
            
            cur.execute("SELECT COUNT(*) FROM deeds;")
            deed_count = cur.fetchone()[0]
            
            cur.execute("SELECT plan, COUNT(*) FROM users GROUP BY plan ORDER BY plan;")
            plan_stats = cur.fetchall()
            
            print("\n📊 Database Summary:")
            print(f"   👥 Total Users: {user_count}")
            print(f"   📄 Total Deeds: {deed_count}")
            print("   💼 Plan Distribution:")
            for plan, count in plan_stats:
                print(f"      {plan.capitalize()}: {count} users")
            
            print("\n🔑 Test Accounts Created:")
            print("   📧 test@escrow.com (password: testpass123) - Free plan")
            print("   📧 pro@title.com (password: propass123) - Professional plan") 
            print("   📧 admin@deedpro.com (password: adminpass123) - Enterprise plan")
            
        conn.close()
        print("\n🎉 Database initialization completed successfully!")
        return True
        
    except psycopg2.Error as e:
        print(f"❌ Database error: {e}")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Initializing DeedPro Database...")
    print("=" * 50)
    
    success = init_database()
    
    if success:
        print("\n✅ Ready to start developing with registration and Stripe integration!")
        print("💡 Next steps:")
        print("   1. Update backend with registration and Stripe endpoints")
        print("   2. Create registration page and enhance account settings")
        print("   3. Test locally with the seeded accounts")
        print("   4. Deploy to Render with proper environment variables")
    else:
        print("\n❌ Database initialization failed. Please check your configuration.") 