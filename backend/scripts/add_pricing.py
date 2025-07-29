import psycopg2
from dotenv import load_dotenv
import os

load_dotenv()

def add_pricing_table():
    """Add pricing table to the database"""
    try:
        # Connect to database
        db_url = os.getenv("DATABASE_URL") or os.getenv("DB_URL")
        if not db_url:
            print("❌ Error: DATABASE_URL or DB_URL not found in environment variables")
            return False
            
        conn = psycopg2.connect(db_url)
        print("✅ Connected to database successfully")
        
        with conn.cursor() as cur:
            # Create pricing table
            print("📋 Creating pricing table...")
            cur.execute("""
                CREATE TABLE IF NOT EXISTS pricing (
                    id SERIAL PRIMARY KEY,
                    plan_name VARCHAR(50) UNIQUE NOT NULL,
                    price DECIMAL(10,2) NOT NULL,
                    stripe_price_id VARCHAR(50),
                    stripe_product_id VARCHAR(50),
                    features JSONB,
                    is_active BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_synced TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            
            # Insert default pricing plans (without Stripe IDs initially)
            print("💰 Adding default pricing plans...")
            cur.execute("""
                INSERT INTO pricing (plan_name, price, features) VALUES
                ('starter', 0.00, '["5 deeds/month", "Basic deed wizard", "Standard templates"]'::jsonb),
                ('professional', 29.00, '["Unlimited deeds", "Advanced templates", "SoftPro integration", "Priority support"]'::jsonb),
                ('enterprise', 99.00, '["All features", "API access", "Custom templates", "Team management", "White-label option"]'::jsonb)
                ON CONFLICT (plan_name) DO NOTHING;
            """)
            
            # Create index for faster plan lookups
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_pricing_plan_name ON pricing(plan_name);
                CREATE INDEX IF NOT EXISTS idx_pricing_active ON pricing(is_active);
            """)
            
            conn.commit()
            print("✅ Pricing table created successfully")
            
            # Verify the data
            cur.execute("SELECT plan_name, price, features FROM pricing ORDER BY price")
            rows = cur.fetchall()
            print("\n📊 Current pricing plans:")
            for row in rows:
                print(f"  - {row[0].capitalize()}: ${row[1]}/month")
                features = row[2] if row[2] else []
                for feature in features:
                    print(f"    • {feature}")
                print()
                
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Error setting up pricing table: {e}")
        return False

if __name__ == "__main__":
    success = add_pricing_table()
    if success:
        print("🎉 Pricing table setup completed successfully!")
    else:
        print("💥 Pricing table setup failed!") 