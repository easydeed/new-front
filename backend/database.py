import json
import os
import psycopg2
from dotenv import load_dotenv

from db_rows import ROW_FACTORY

load_dotenv()

# Get the database URL from environment variable
DATABASE_URL = os.getenv("DATABASE_URL")

def get_db_connection():
    """A fresh connection, on the ONE row contract (see db_rows.py).

    This helper used to hand out RealDictCursor connections while
    db.get_db_connection returned tuple rows — two helpers, two row
    types, nothing in either name saying which. That ambiguity 401'd
    every partner API key for months. Both now use db_rows.ROW_FACTORY,
    whose rows answer to BOTH `row[0]` and `row['name']`, so there is no
    longer a wrong way to read one.
    """
    try:
        conn = psycopg2.connect(DATABASE_URL, cursor_factory=ROW_FACTORY,
                                connect_timeout=10)
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

        # ──────────────────────────────────────────────────────────────
        # H1: ONE SCHEMA AUTHORITY. Every column/table the code needs is
        # converged here, idempotently, at startup — production and the
        # six-flow test DB derive from this same function. The columns
        # below existed in production via historical migrations but not in
        # the CREATEs above; the six-flow harness used to carry its own
        # copy of these ALTERs, which is exactly how completed_at ended up
        # existing in tests but not production (the silent-PDF-store
        # incident, 2026-07-28). ensure_schema no longer amends schema.
        # Any deliberate test-only divergence requires a cited comment.
        # ──────────────────────────────────────────────────────────────
        for stmt in [
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255)",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user'",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS plan VARCHAR(50) DEFAULT 'free'",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255)",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50)",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS company_name VARCHAR(255)",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS company_type VARCHAR(100)",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS state VARCHAR(10)",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50)",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS subscribe BOOLEAN DEFAULT FALSE",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS agree_terms BOOLEAN DEFAULT TRUE",
            "ALTER TABLE deeds ADD COLUMN IF NOT EXISTS grantor_name VARCHAR(255)",
            "ALTER TABLE deeds ADD COLUMN IF NOT EXISTS grantee_name VARCHAR(255)",
            "ALTER TABLE deeds ADD COLUMN IF NOT EXISTS pdf_url VARCHAR(500)",
            "ALTER TABLE deeds ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'",
            "ALTER TABLE deeds ADD COLUMN IF NOT EXISTS requested_by VARCHAR(255)",
            # FORMS wave 1 — parties JSONB (owner-ledgered migration; both
            # triggers fired: catalog >10 types AND single-party instruments
            # whose parties cannot map onto grantor/grantee). ADDITIVE and
            # nullable; legacy columns untouched and still authoritative for
            # two-party instruments. No backfill.
            "ALTER TABLE deeds ADD COLUMN IF NOT EXISTS parties JSONB",
            # The column whose absence broke every production PDF store:
            # store_deed_pdf stamps completed-on-store (PR #41); the ALTER
            # only ever ran in the test harness. Now it runs here.
            "ALTER TABLE deeds ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP",
            """CREATE TABLE IF NOT EXISTS deed_pdfs (
                deed_id INTEGER PRIMARY KEY REFERENCES deeds(id) ON DELETE CASCADE,
                pdf_data BYTEA NOT NULL,
                sha256 VARCHAR(64) NOT NULL,
                generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )""",
            """CREATE TABLE IF NOT EXISTS deed_shares (
                id SERIAL PRIMARY KEY,
                deed_id INT NOT NULL,
                owner_user_id INT NOT NULL,
                recipient_email TEXT NOT NULL,
                token UUID DEFAULT gen_random_uuid(),
                status VARCHAR(16) DEFAULT 'sent',
                expires_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ DEFAULT now(),
                updated_at TIMESTAMPTZ DEFAULT now(),
                feedback TEXT, feedback_at TIMESTAMPTZ, feedback_by VARCHAR(255),
                viewed_at TIMESTAMPTZ, view_count INT DEFAULT 0,
                last_reminder_sent_at TIMESTAMPTZ, reminder_count INT DEFAULT 0
            )""",
            """CREATE TABLE IF NOT EXISTS plan_limits (
                plan_name VARCHAR(50) PRIMARY KEY,
                max_deeds_per_month INT,
                api_calls_per_month INT,
                ai_assistance BOOLEAN,
                integrations_enabled BOOLEAN,
                priority_support BOOLEAN
            )""",
            # ── A1: API lane under the ONE SCHEMA AUTHORITY ──────────────
            # The mounted /api/v1 depended on tables that existed only in
            # hand-run migration files (001/005). Production check
            # (2026-08-03): all of them exist there and all are EMPTY —
            # nothing ever authenticated, so nothing ever wrote. The
            # CREATEs therefore no-op in production and create fresh
            # elsewhere; the ALTER ladder converges an existing
            # 001-shaped table onto Gen 3's design. No data to preserve.
            """CREATE TABLE IF NOT EXISTS api_keys (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                key_prefix TEXT NOT NULL,
                key_hash TEXT NOT NULL,
                name TEXT,
                company TEXT,
                user_id TEXT,
                organization_id INT,
                scopes TEXT[] DEFAULT ARRAY['deed:create','deed:read'],
                is_active BOOLEAN DEFAULT TRUE,
                is_test BOOLEAN DEFAULT FALSE,
                rate_limit_hour INT DEFAULT 100,
                rate_limit_day INT DEFAULT 1000,
                created_by_email TEXT,
                last_used_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ DEFAULT now(),
                revoked_at TIMESTAMPTZ
            )""",
            "ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS name TEXT",
            "ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS organization_id INT",
            "ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS is_test BOOLEAN DEFAULT FALSE",
            "ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS rate_limit_hour INT DEFAULT 100",
            "ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS rate_limit_day INT DEFAULT 1000",
            "ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS created_by_email TEXT",
            "ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ",
            # 001's company was NOT NULL; Gen-3 creates don't set it — the
            # admin mint would violate the constraint on a migrated table.
            # GUARDED, and the guard is load-bearing: schema convergence
            # runs in a daemon thread at startup (see _converge_schema_
            # with_retry) while the app already serves traffic, and a bare
            # ALTER takes ACCESS EXCLUSIVE on a table that in-flight
            # requests hold FK locks on — that deadlocks (observed in the
            # A1 harness). The DO block takes no lock when the column is
            # already nullable, which is every run after the first.
            """DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'api_keys' AND column_name = 'company'
                      AND is_nullable = 'NO'
                ) THEN
                    ALTER TABLE api_keys ALTER COLUMN company DROP NOT NULL;
                END IF;
            END $$""",
            "CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix)",
            """CREATE TABLE IF NOT EXISTS api_deeds (
                id SERIAL PRIMARY KEY,
                deed_id VARCHAR(50) UNIQUE NOT NULL,
                document_id VARCHAR(20) UNIQUE NOT NULL,
                api_key_id UUID REFERENCES api_keys(id),
                deed_type VARCHAR(50),
                status VARCHAR(20) DEFAULT 'completed',
                property_address TEXT,
                property_city VARCHAR(100),
                property_county VARCHAR(100),
                property_apn VARCHAR(50),
                grantor_name TEXT,
                grantee_name TEXT,
                transfer_tax_amount DECIMAL(10,2),
                transfer_tax_exempt BOOLEAN,
                pdf_data BYTEA,
                request_data JSONB,
                authenticity_id UUID,
                idempotency_key TEXT,
                created_at TIMESTAMPTZ DEFAULT now()
            )""",
            "ALTER TABLE api_deeds ADD COLUMN IF NOT EXISTS idempotency_key TEXT",
            """CREATE UNIQUE INDEX IF NOT EXISTS uq_api_deeds_idempotency
               ON api_deeds(api_key_id, idempotency_key)
               WHERE idempotency_key IS NOT NULL""",
            "CREATE INDEX IF NOT EXISTS idx_api_deeds_key ON api_deeds(api_key_id)",
            """CREATE TABLE IF NOT EXISTS api_usage_log (
                id SERIAL PRIMARY KEY,
                api_key_id UUID REFERENCES api_keys(id),
                endpoint VARCHAR(200),
                method VARCHAR(10),
                status_code INT,
                response_time_ms INT,
                ip_address INET,
                user_agent VARCHAR(500),
                error_message TEXT,
                created_at TIMESTAMPTZ DEFAULT now()
            )""",
            "CREATE INDEX IF NOT EXISTS idx_api_usage_log_key ON api_usage_log(api_key_id, created_at)",
            # A3: the API-access inquiry funnel. The request form used to
            # fake its own submission (setTimeout, then a success screen
            # promising a 24-hour review nobody could perform, because
            # nothing was ever sent or stored). Requests land here, the
            # owner is emailed through the one honest transport, and the
            # admin API tab lists them — key issuance stays manual per
            # ruling, so this table IS the queue.
            """CREATE TABLE IF NOT EXISTS api_key_requests (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                company_name TEXT NOT NULL,
                business_type TEXT,
                contact_name TEXT,
                email TEXT NOT NULL,
                phone TEXT,
                use_case TEXT,
                expected_volume TEXT,
                integration_timeline TEXT,
                current_software TEXT,
                additional_info TEXT,
                status VARCHAR(20) DEFAULT 'new',
                notified_at TIMESTAMPTZ,
                notify_error TEXT,
                created_at TIMESTAMPTZ DEFAULT now()
            )""",
            "CREATE INDEX IF NOT EXISTS idx_api_key_requests_status ON api_key_requests(status, created_at)",
            """CREATE TABLE IF NOT EXISTS api_rate_limits (
                id SERIAL PRIMARY KEY,
                api_key_id UUID,
                window_type VARCHAR(10),
                window_key VARCHAR(20),
                request_count INT DEFAULT 1,
                created_at TIMESTAMPTZ DEFAULT now(),
                UNIQUE(api_key_id, window_type, window_key)
            )""",
            # Same-invariant gap, declared (not silently absorbed — named
            # in the A1 report): the LIVE verification system and the E1
            # in-app notification writes also depended on hand-run
            # migrations. 004's FK (created_by_user_id UUID REFERENCES
            # users(id)) cannot apply against SERIAL users.id — corrected
            # to INTEGER here. Notifications use the 20251011 shape the
            # code actually reads (read/read_at, not is_read).
            """CREATE TABLE IF NOT EXISTS document_authenticity (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                short_code VARCHAR(16) UNIQUE NOT NULL,
                document_type VARCHAR(50) NOT NULL,
                property_address TEXT,
                property_apn VARCHAR(50),
                county VARCHAR(100),
                grantor_display VARCHAR(255),
                grantee_display VARCHAR(255),
                content_hash VARCHAR(64) NOT NULL,
                pdf_hash VARCHAR(64),
                generated_at TIMESTAMPTZ DEFAULT now(),
                first_verified_at TIMESTAMPTZ,
                last_verified_at TIMESTAMPTZ,
                verification_count INTEGER DEFAULT 0,
                organization_id UUID,
                created_by_user_id INTEGER REFERENCES users(id),
                status VARCHAR(20) DEFAULT 'active',
                revoked_at TIMESTAMPTZ,
                revoked_reason TEXT,
                superseded_by UUID REFERENCES document_authenticity(id),
                deed_id INTEGER,
                CONSTRAINT valid_status CHECK (status IN ('active', 'revoked', 'superseded'))
            )""",
            "CREATE INDEX IF NOT EXISTS idx_doc_auth_short_code ON document_authenticity(short_code)",
            """CREATE TABLE IF NOT EXISTS verification_log (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                document_id UUID REFERENCES document_authenticity(id) ON DELETE CASCADE,
                verified_at TIMESTAMPTZ DEFAULT now(),
                verification_method VARCHAR(20) NOT NULL,
                result VARCHAR(20) NOT NULL,
                ip_hash VARCHAR(64),
                user_agent_hash VARCHAR(64),
                country_code VARCHAR(2),
                error_message TEXT
            )""",
            """CREATE TABLE IF NOT EXISTS notifications (
                id SERIAL PRIMARY KEY,
                type VARCHAR(50),
                title TEXT NOT NULL,
                message TEXT,
                severity VARCHAR(20) DEFAULT 'info',
                payload JSONB,
                link TEXT,
                created_at TIMESTAMPTZ DEFAULT now()
            )""",
            "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS severity VARCHAR(20) DEFAULT 'info'",
            "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS payload JSONB",
            "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS link TEXT",
            """CREATE TABLE IF NOT EXISTS user_notifications (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                notification_id INTEGER NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
                read BOOLEAN NOT NULL DEFAULT FALSE,
                read_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ DEFAULT now()
            )""",
            "ALTER TABLE user_notifications ADD COLUMN IF NOT EXISTS read BOOLEAN NOT NULL DEFAULT FALSE",
            "ALTER TABLE user_notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ",
            "CREATE INDEX IF NOT EXISTS idx_user_notifications_unread ON user_notifications(user_id, read)",
        ]:
            cursor.execute(stmt)

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
        
        # F3: server-truth onboarding flag (additive, idempotent — this runs
        # at startup, which is how this schema is managed).
        cursor.execute("""
            ALTER TABLE user_profiles
            ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE
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
        
        # T6/T7: property_cache_tp creation removed (table dead, dropped)
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
        print(f"[Phase 11] No database connection!")
        return None
    
    try:
        cursor = conn.cursor()
        
        # Phase 11: Debug logging
        print(f"[Phase 11] Inserting deed with data: user_id={user_id}, deed_type={deed_data.get('deed_type')}, property_address={deed_data.get('property_address')}, apn={deed_data.get('apn')}")
        
        # Phase 15 Backend Hotfix V1: Defensive validation before DB insert.
        # FORMS: single-party families carry their parties in the JSONB
        # column instead of the grantor/grantee pair — require at least one
        # named party there; two-party instruments keep the strict pair.
        from services.form_families import is_single_party, requires_legal_description
        if is_single_party(deed_data.get('deed_type')):
            critical_fields = (
                ['legal_description']
                if requires_legal_description(deed_data.get('deed_type'))
                else []
            )
            parties = deed_data.get('parties') or {}
            if not any((v or '').strip() for v in parties.values()):
                print(f"[Database.create_deed] ❌ ERROR: single-party instrument with no named party!")
                return None
        else:
            critical_fields = ['grantor_name', 'grantee_name', 'legal_description']
        for field in critical_fields:
            if not deed_data.get(field):
                print(f"[Database.create_deed] ❌ ERROR: Missing {field} in deed_data!")
                print(f"[Database.create_deed] deed_data: {deed_data}")
                return None
        
        # T2: persist the builder extras (DTT, reference numbers, mail-to)
        # into metadata JSONB so the stored PDF can render the full document.
        extras = {
            key: deed_data.get(key)
            for key in ('dtt', 'title_order_no', 'escrow_no', 'return_to', 'source', 'provenance',
                        'property_city', 'property_state', 'property_zip', 'current_owner',
                        'requested_by_address', 'affidavit')
            if deed_data.get(key)
        }

        cursor.execute("""
            INSERT INTO deeds (user_id, deed_type, property_address, apn, county,
                             legal_description, owner_type, sales_price,
                             grantor_name, grantee_name, vesting, requested_by, parties, metadata)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s::jsonb)
            RETURNING *
        """, (
            user_id,
            deed_data.get('deed_type'),
            deed_data.get('property_address') or 'Unknown',  # Fallback for empty string
            deed_data.get('apn'),
            deed_data.get('county'),
            deed_data.get('legal_description'),
            deed_data.get('owner_type'),
            deed_data.get('sales_price'),
            deed_data.get('grantor_name'),  # Phase 11 Fix: Add grantor field
            deed_data.get('grantee_name'),
            deed_data.get('vesting'),
            deed_data.get('requested_by'),  # Phase 16: Add requested_by field
            json.dumps(deed_data['parties']) if deed_data.get('parties') else None,
            json.dumps(extras)
        ))
        
        deed = cursor.fetchone()
        conn.commit()
        cursor.close()
        conn.close()
        
        print(f"[Phase 11] Deed created successfully: {deed.get('id') if deed else 'None'}")
        return dict(deed) if deed else None
        
    except Exception as e:
        print(f"[Phase 11] Error creating deed: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        if conn:
            conn.close()
        return None

def update_deed_draft(user_id, deed_id, deed_data):
    """Ticket R: regenerating a resumed draft updates its row, never inserts
    a second one. Only drafts are mutable — immutability applies to stored
    PDFs, which flip status to 'completed'; this helper refuses those rows
    (and deleted ones) by matching status in the WHERE clause. Metadata is
    rebuilt exactly like create_deed so the stored PDF renders identically."""
    conn = get_db_connection()
    if not conn:
        return None
    try:
        cursor = conn.cursor()
        extras = {
            key: deed_data.get(key)
            for key in ('dtt', 'title_order_no', 'escrow_no', 'return_to', 'source', 'provenance',
                        'property_city', 'property_state', 'property_zip', 'current_owner',
                        'requested_by_address', 'affidavit')
            if deed_data.get(key)
        }
        cursor.execute("""
            UPDATE deeds
            SET deed_type = %s, property_address = %s, apn = %s, county = %s,
                legal_description = %s, grantor_name = %s, grantee_name = %s,
                vesting = %s, requested_by = %s, parties = %s::jsonb, metadata = %s::jsonb,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s AND user_id = %s
              AND COALESCE(status, 'draft') NOT IN ('completed', 'deleted')
            RETURNING *
        """, (
            deed_data.get('deed_type'),
            deed_data.get('property_address') or 'Unknown',
            deed_data.get('apn'),
            deed_data.get('county'),
            deed_data.get('legal_description'),
            deed_data.get('grantor_name'),
            deed_data.get('grantee_name'),
            deed_data.get('vesting'),
            deed_data.get('requested_by'),
            json.dumps(deed_data['parties']) if deed_data.get('parties') else None,
            json.dumps(extras),
            deed_id,
            user_id,
        ))
        deed = cursor.fetchone()
        conn.commit()
        cursor.close()
        conn.close()
        return dict(deed) if deed else None
    except Exception as e:
        print(f"[Ticket R] Error updating draft {deed_id}: {type(e).__name__}: {e}")
        if conn:
            conn.close()
        return None

def save_draft_row(user_id, deed_id, deed_data):
    """U1 autosave: persist in-progress builder state as a draft row.

    Unlike create_deed/update_deed_draft (the GENERATE path, which demands
    grantor/grantee/legal), a draft may be arbitrarily incomplete — exit
    must never silently destroy work. Status stays 'draft'; the update arm
    refuses completed (stored-PDF immutability) and deleted rows. Returns
    the row dict (the caller keeps the id for subsequent saves/generate).
    """
    conn = get_db_connection()
    if not conn:
        return None
    try:
        cursor = conn.cursor()
        extras = {
            key: deed_data.get(key)
            for key in ('dtt', 'title_order_no', 'escrow_no', 'return_to', 'source', 'provenance',
                        'property_city', 'property_state', 'property_zip', 'current_owner',
                        'requested_by_address', 'affidavit')
            if deed_data.get(key)
        }
        if deed_id:
            cursor.execute("""
                UPDATE deeds
                SET deed_type = %s, property_address = %s, apn = %s, county = %s,
                    legal_description = %s, grantor_name = %s, grantee_name = %s,
                    vesting = %s, requested_by = %s, parties = %s::jsonb, metadata = %s::jsonb,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s AND user_id = %s
                  AND COALESCE(status, 'draft') NOT IN ('completed', 'deleted')
                RETURNING *
            """, (
                deed_data.get('deed_type'),
                deed_data.get('property_address'),
                deed_data.get('apn'),
                deed_data.get('county'),
                deed_data.get('legal_description'),
                deed_data.get('grantor_name'),
                deed_data.get('grantee_name'),
                deed_data.get('vesting'),
                deed_data.get('requested_by'),
                json.dumps(deed_data['parties']) if deed_data.get('parties') else None,
                json.dumps(extras),
                deed_id,
                user_id,
            ))
        else:
            cursor.execute("""
                INSERT INTO deeds (user_id, deed_type, property_address, apn, county,
                                   legal_description, grantor_name, grantee_name,
                                   vesting, requested_by, parties, status, metadata)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, 'draft', %s::jsonb)
                RETURNING *
            """, (
                user_id,
                deed_data.get('deed_type'),
                deed_data.get('property_address'),
                deed_data.get('apn'),
                deed_data.get('county'),
                deed_data.get('legal_description'),
                deed_data.get('grantor_name'),
                deed_data.get('grantee_name'),
                deed_data.get('vesting'),
                deed_data.get('requested_by'),
                json.dumps(deed_data['parties']) if deed_data.get('parties') else None,
                json.dumps(extras),
            ))
        deed = cursor.fetchone()
        conn.commit()
        cursor.close()
        conn.close()
        return dict(deed) if deed else None
    except Exception as e:
        print(f"[U1] Error saving draft {deed_id or '(new)'}: {type(e).__name__}: {e}")
        if conn:
            conn.close()
        return None

def get_user_deeds(user_id):
    conn = get_db_connection()
    if not conn:
        return []
    
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM deeds WHERE user_id = %s AND COALESCE(status, '') <> 'deleted' ORDER BY created_at DESC", (user_id,))
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

def clean_profile_text(value):
    """Trim + collapse internal whitespace on a profile text field.

    Profile strings print on deed faces (requested-by, company lines) —
    '  Pacific COast TItle ' was stored verbatim and rode onto documents.
    Whitespace is machine noise and gets fixed here; CASE is the owner's
    text and is never touched (auto-'fixing' McDonald or LLC would corrupt
    real names). Blank collapses to None.
    """
    if value is None:
        return None
    cleaned = " ".join(str(value).split())
    return cleaned or None


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
            # Deed-face fields are normalized at the write choke point —
            # whatever endpoint or script feeds this, the row is clean.
            clean_profile_text(profile_data.get('company_name')),
            clean_profile_text(profile_data.get('business_address')),
            clean_profile_text(profile_data.get('license_number')),
            profile_data.get('role', 'escrow_officer'),
            clean_profile_text(profile_data.get('default_county')),
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

# Schema convergence at startup — OFF the import path. Running
# create_tables() synchronously at import blocked uvicorn's port binding;
# on 2026-07-28 a slow boot exceeded Render's port-detection window and the
# deploy timed out ("No open ports detected"), leaving the OLD instance
# serving. The daemon thread lets the port bind immediately; the schema
# converges seconds later, with retries and loud logging (a failed
# convergence must never be silent — one-schema-authority rule).
def _converge_schema_with_retry(attempts: int = 5, delay_seconds: int = 5):
    import time as _time
    for attempt in range(1, attempts + 1):
        try:
            if create_tables():
                print(f"[schema] Converged on attempt {attempt}")
                return
            print(f"[schema] create_tables returned False (attempt {attempt}/{attempts})")
        except Exception as e:
            print(f"[schema] Convergence error (attempt {attempt}/{attempts}): {e}")
        _time.sleep(delay_seconds)
    print("[schema] FAILED to converge after all attempts — columns the code "
          "expects may be missing until the next restart")


if DATABASE_URL:
    import threading
    threading.Thread(target=_converge_schema_with_retry, daemon=True,
                     name="schema-convergence").start()
else:
    print("Warning: DATABASE_URL environment variable not set") 