import json
import os
from contextlib import contextmanager

import psycopg2
from dotenv import load_dotenv
from fastapi import HTTPException

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


@contextmanager
def db_connection(unavailable_detail="Database unavailable"):
    """A connection that closes on EVERY path out. RED-H1.2.

    ═══ WHY THIS EXISTS ═══

    `get_db_connection()` opens a real socket. Every caller was then
    responsible for closing it — and callers raise. `api_key_requests`
    opened four connections and closed each one on exactly one of its
    three exits; `admin_api_v2` opened eighteen and closed two.

    A leaked connection is not garbage-collected in any useful sense:
    Postgres holds the backend process open until the client goes away or
    a timeout fires, and the instance has a hard `max_connections`. Leak
    enough and the database stops accepting new work — for everyone, not
    just the leaking endpoint.

    The worst instance was on the PUBLIC, unauthenticated inquiry
    endpoint, where the leaking path was the cheapest one to hit: send a
    whitespace-only company name, get a 400, leak a connection. No
    account, no rate limit, a few hundred requests to take the product
    down. That is a denial of service reachable by anyone with curl, and
    it was a missing `finally`.

    So this replaces the discipline with a mechanism. `with
    db_connection() as conn:` closes on return, on raise, on
    HTTPException, on anything — because the fix for "everyone must
    remember" is never "remind everyone."

    The 503 is raised INSIDE the manager rather than returning None, so
    `if not conn` checks cannot be forgotten either.
    """
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=503, detail=unavailable_detail)
    try:
        yield conn
    finally:
        try:
            conn.close()
        except Exception as e:
            # A close that fails is worth a line, never an exception: it
            # would mask whatever the caller was actually raising.
            print(f"[db_connection] close failed: {e}")

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
            # ── T-5: correction lineage ──────────────────────────────────
            #
            # Mirrors document_authenticity's proven shape — a pointer to
            # the instrument that replaced this one, plus when. That table
            # has carried `status='superseded' + superseded_by` since the
            # verification work; `deeds` has had no equivalent, which is
            # why the generation gate's "generate a corrected deed — the
            # record keeps both" was a promise with nothing behind it
            # (T-0 removed the sentence; this ticket earns it back).
            #
            # ONE DELIBERATE DIVERGENCE FROM THAT SHAPE, flagged in the
            # T-5 report: the lineage state is DERIVED from this pointer
            # rather than added to `deeds.status`. That column already
            # carries a lifecycle vocabulary in active use
            # (draft/completed/deleted) and the admin console filters on
            # it. Adding 'superseded' would make it mutually exclusive
            # with 'completed', and those are orthogonal facts — a
            # superseded deed is still a completed deed. It was recorded,
            # it exists, and pretending otherwise is the un-recording this
            # ticket refuses to do.
            "ALTER TABLE deeds ADD COLUMN IF NOT EXISTS superseded_by INTEGER REFERENCES deeds(id)",
            "ALTER TABLE deeds ADD COLUMN IF NOT EXISTS superseded_at TIMESTAMPTZ",
            "CREATE INDEX IF NOT EXISTS idx_deeds_superseded_by ON deeds(superseded_by)",
            # RED-S2: RESTRICT, not CASCADE.
            #
            # §9 refuses to OVERWRITE a stored instrument, and the
            # application enforces that carefully. The schema meanwhile
            # handed DELETE a cascade: remove a deed row and its PDF and
            # sha256 went with it, silently, in the same statement.
            #
            # The doctrine guarded one verb. A cleanup script — `DELETE
            # FROM deeds WHERE created_at < ...`, the kind somebody
            # writes on a Friday — would have taken every notarised
            # instrument with it and left nothing to prove what had been
            # there.
            #
            # RESTRICT makes that impossible: the delete fails while an
            # artifact exists, and removing the artifact becomes a
            # deliberate act rather than a side effect. Deletion is
            # already SOFT everywhere in this product (status='deleted'),
            # so nothing legitimate is blocked by this.
            """CREATE TABLE IF NOT EXISTS deed_pdfs (
                deed_id INTEGER PRIMARY KEY REFERENCES deeds(id) ON DELETE RESTRICT,
                pdf_data BYTEA NOT NULL,
                sha256 VARCHAR(64) NOT NULL,
                generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )""",
            # Existing databases were created with CASCADE, and a
            # CREATE TABLE IF NOT EXISTS does not alter them. Rebuild the
            # constraint by name, idempotently.
            """DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM pg_constraint c
                    JOIN pg_class t ON t.oid = c.conrelid
                    WHERE t.relname = 'deed_pdfs'
                      AND c.contype = 'f'
                      AND c.confdeltype = 'c'
                ) THEN
                    ALTER TABLE deed_pdfs DROP CONSTRAINT deed_pdfs_deed_id_fkey;
                    ALTER TABLE deed_pdfs
                        ADD CONSTRAINT deed_pdfs_deed_id_fkey
                        FOREIGN KEY (deed_id) REFERENCES deeds(id) ON DELETE RESTRICT;
                END IF;
            END $$;""",
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
            # ── ADMIN3: the transport ledger ─────────────────────────────
            # Eleven email templates. Ten of their outcomes were printed
            # to stdout and discarded; only api_key_requests persisted
            # one (notified_at / notify_error), and it did so because
            # that table IS a queue somebody has to work.
            #
            # The consequence is the 3 AM question nobody could answer:
            # a customer says "I never got the approval email" and the
            # only record is a log line on a container that has since
            # restarted. Render keeps stdout for a while; "a while" is
            # not an answer to "did we send it, and what did SendGrid
            # say?"
            #
            # One row per ATTEMPT, written at the single choke point
            # every template already passes through (utils/notifications
            # ._send). `reason` is the S1 diagnosis string — the same
            # actionable text that already reaches the logs, e.g. "from
            # address does not match a verified Sender Identity" — kept
            # rather than reduced to a boolean, because the boolean was
            # never the part anybody needed.
            #
            # `recipient` is stored in full, deliberately. ADMIN4's
            # ruling masks personal fields in the AUDIT log, where the
            # value is evidence about an admin's action. Here the
            # address IS the operational fact: "did jane@escrow.com get
            # it" cannot be answered against a mask.
            """CREATE TABLE IF NOT EXISTS email_log (
                id BIGSERIAL PRIMARY KEY,
                template VARCHAR(64) NOT NULL,
                recipient TEXT NOT NULL,
                subject TEXT,
                status VARCHAR(10) NOT NULL,
                reason TEXT,
                user_id INTEGER,
                context JSONB,
                created_at TIMESTAMPTZ DEFAULT now()
            )""",
            "CREATE INDEX IF NOT EXISTS idx_email_log_created ON email_log(created_at DESC)",
            "CREATE INDEX IF NOT EXISTS idx_email_log_status ON email_log(status, created_at DESC)",
            "CREATE INDEX IF NOT EXISTS idx_email_log_template ON email_log(template, created_at DESC)",
            "CREATE INDEX IF NOT EXISTS idx_email_log_recipient ON email_log(LOWER(recipient))",
            # RED-S3 — sessions that can be ended.
            #
            # Before this, a leaked token was valid for up to 30 minutes
            # and there was no mechanism to kill it: no jti, so no name to
            # revoke, so "logout" was a localStorage delete while the
            # token kept working.
            """CREATE TABLE IF NOT EXISTS revoked_tokens (
                jti VARCHAR(64) PRIMARY KEY,
                user_id INTEGER,
                reason VARCHAR(32),
                revoked_at TIMESTAMPTZ DEFAULT now()
            )""",
            "CREATE INDEX IF NOT EXISTS idx_revoked_user ON revoked_tokens(user_id)",
            # `family` ties every rotation of one login together, so a
            # replayed (already-rotated) token can take the whole family
            # down rather than leaving a thief and an officer sharing a
            # session nobody can tell apart.
            """CREATE TABLE IF NOT EXISTS refresh_tokens (
                jti VARCHAR(64) PRIMARY KEY,
                user_id INTEGER NOT NULL,
                family VARCHAR(64) NOT NULL,
                issued_at TIMESTAMPTZ DEFAULT now(),
                expires_at TIMESTAMPTZ NOT NULL,
                used_at TIMESTAMPTZ,
                replaced_by VARCHAR(64),
                revoked_at TIMESTAMPTZ,
                revoke_reason VARCHAR(32)
            )""",
            "CREATE INDEX IF NOT EXISTS idx_refresh_family ON refresh_tokens(family)",
            "CREATE INDEX IF NOT EXISTS idx_refresh_user ON refresh_tokens(user_id)",
            # Login attempts, for lockout. There was NO throttle of any
            # kind on password guessing — unlimited attempts against
            # bcrypt at whatever rate the host would serve.
            """CREATE TABLE IF NOT EXISTS login_attempts (
                id BIGSERIAL PRIMARY KEY,
                email TEXT NOT NULL,
                ip TEXT,
                succeeded BOOLEAN NOT NULL,
                attempted_at TIMESTAMPTZ DEFAULT now()
            )""",
            "CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(LOWER(email), attempted_at DESC)",
            # RED-S4 — recording state.
            #
            # RED0 R2-7/R3-8: `deeds` had NO recording fields at all. The
            # status vocabulary ran draft -> completed -> deleted, where
            # "completed" means only THAT WE RENDERED A PDF.
            #
            # So the single most important fact in the life of any deed —
            # that it recorded, when, and under what instrument number —
            # had no home. Two consequences, both load-bearing:
            #
            #   1. The officer's own log stayed the system of record, so
            #      the product was a step in her process rather than her
            #      process.
            #   2. supersession.py reasons about "instruments that already
            #      exist in the world" and enforces it with
            #      `status == 'completed'` — which cannot tell a deed that
            #      recorded last Tuesday from one that was generated,
            #      previewed and thrown away. walk_chain returns a lineage
            #      that looks authoritative and answers the drafting
            #      history, not the county's record.
            #
            # OFFICER-RECORDED, by ruling. We do not learn this from the
            # county — there is no e-recording integration and inventing
            # one would be the fabricated-success disease. These columns
            # hold HER STATEMENT that it recorded, with her name and the
            # time she said so, which is the same posture as the notary
            # handoff: completion is always someone's recorded statement,
            # never the system's assertion.
            "ALTER TABLE deeds ADD COLUMN IF NOT EXISTS recorded_at TIMESTAMPTZ",
            "ALTER TABLE deeds ADD COLUMN IF NOT EXISTS instrument_number VARCHAR(64)",
            "ALTER TABLE deeds ADD COLUMN IF NOT EXISTS recording_asserted_by INTEGER",
            "ALTER TABLE deeds ADD COLUMN IF NOT EXISTS recording_asserted_at TIMESTAMPTZ",
            "CREATE INDEX IF NOT EXISTS idx_deeds_recorded ON deeds(recorded_at) WHERE recorded_at IS NOT NULL",
            # RED-H1.3 — the AI exchange log.
            #
            # Nothing recorded what the assistant told an escrow officer.
            # The confirmation trail can prove exactly what DATA she
            # accepted and can prove nothing about what the machine said
            # to her before she accepted it — which is adversarially
            # perfect in the wrong direction: the record incriminates the
            # human and exonerates the software.
            #
            # It also means the UPL question cannot be ASSESSED. Nobody
            # can read a hundred real exchanges and say whether they
            # constitute advice on instrument selection, because a
            # hundred real exchanges do not exist anywhere. This table is
            # the precondition for that ruling, not the ruling.
            """CREATE TABLE IF NOT EXISTS ai_exchange_log (
                id BIGSERIAL PRIMARY KEY,
                user_id INTEGER,
                prompt_key VARCHAR(64) NOT NULL,
                user_message TEXT,
                response TEXT,
                model VARCHAR(64),
                max_tokens INTEGER,
                status VARCHAR(16) NOT NULL,
                error TEXT,
                request_tag VARCHAR(80),
                created_at TIMESTAMPTZ DEFAULT now(),
                -- DOCTRINE B: what the boundary scanner found in this
                -- response, as JSON, or NULL when it found nothing.
                -- NULL-when-clean on purpose: a compliant exchange costs
                -- no storage and `WHERE boundary_flags IS NOT NULL` is
                -- the entire audit query.
                boundary_flags TEXT
            )""",
            # For tables created before Doctrine B. Idempotent, and it
            # runs on every boot like the rest of the ladder above.
            "ALTER TABLE ai_exchange_log ADD COLUMN IF NOT EXISTS boundary_flags TEXT",
            "CREATE INDEX IF NOT EXISTS idx_ai_log_flagged ON ai_exchange_log(created_at DESC) WHERE boundary_flags IS NOT NULL",
            "CREATE INDEX IF NOT EXISTS idx_ai_log_user_created ON ai_exchange_log(user_id, created_at DESC)",
            "CREATE INDEX IF NOT EXISTS idx_ai_log_created ON ai_exchange_log(created_at DESC)",
            "CREATE INDEX IF NOT EXISTS idx_ai_log_key ON ai_exchange_log(prompt_key, created_at DESC)",
            """CREATE TABLE IF NOT EXISTS api_rate_limits (
                id SERIAL PRIMARY KEY,
                api_key_id UUID,
                window_type VARCHAR(10),
                window_key VARCHAR(20),
                request_count INT DEFAULT 1,
                created_at TIMESTAMPTZ DEFAULT now(),
                UNIQUE(api_key_id, window_type, window_key)
            )""",
            # ── ADMIN1: the last tables outside the one authority ────────
            # ADMIN0 found live code depending on tables create_tables()
            # never made. Production check (2026-08-03): invoices,
            # payment_history and partners EXIST (hand-run migrations);
            # subscriptions was MISSING ENTIRELY — which is why the
            # Revenue tab's $0 was never a real zero, it was the
            # no-table branch of a try/except (see services/revenue.py,
            # fixed in this same pass to fail loudly instead).
            #
            # Shapes below match migrations/phase23/*.sql and
            # migrations/add_partners_table_v2.py exactly, so the CREATEs
            # no-op against the existing production tables; the ALTER
            # ladders converge any column the code needs.
            """CREATE TABLE IF NOT EXISTS partners (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                organization_id VARCHAR(255) NOT NULL DEFAULT 'default-org',
                created_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                category VARCHAR(50) NOT NULL DEFAULT 'other',
                role VARCHAR(50) NOT NULL DEFAULT 'other',
                company_name VARCHAR(255) NOT NULL,
                contact_name VARCHAR(255),
                email VARCHAR(255),
                phone VARCHAR(50),
                address_line1 VARCHAR(255),
                address_line2 VARCHAR(255),
                city VARCHAR(100),
                state VARCHAR(50),
                postal_code VARCHAR(20),
                notes TEXT,
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )""",
            "CREATE INDEX IF NOT EXISTS idx_partners_org ON partners(organization_id)",
            "CREATE INDEX IF NOT EXISTS idx_partners_active ON partners(is_active)",
            """CREATE TABLE IF NOT EXISTS invoices (
                id SERIAL PRIMARY KEY,
                user_id INT,
                api_key_prefix TEXT,
                invoice_number VARCHAR(50) UNIQUE NOT NULL,
                stripe_invoice_id VARCHAR(255) UNIQUE,
                subtotal_cents INT NOT NULL,
                tax_cents INT DEFAULT 0,
                discount_cents INT DEFAULT 0,
                total_cents INT NOT NULL,
                amount_paid_cents INT DEFAULT 0,
                amount_due_cents INT NOT NULL,
                currency VARCHAR(3) DEFAULT 'USD',
                status VARCHAR(20) NOT NULL,
                billing_period_start TIMESTAMPTZ NOT NULL,
                billing_period_end TIMESTAMPTZ NOT NULL,
                due_date TIMESTAMP NOT NULL,
                paid_at TIMESTAMP,
                voided_at TIMESTAMP,
                line_items JSONB NOT NULL,
                notes TEXT,
                invoice_pdf_url TEXT,
                created_at TIMESTAMPTZ DEFAULT now(),
                updated_at TIMESTAMPTZ DEFAULT now()
            )""",
            """CREATE TABLE IF NOT EXISTS payment_history (
                id SERIAL PRIMARY KEY,
                invoice_id INT REFERENCES invoices(id),
                user_id INT,
                stripe_payment_intent_id VARCHAR(255) UNIQUE,
                stripe_charge_id VARCHAR(255),
                amount_cents INT NOT NULL,
                currency VARCHAR(3) DEFAULT 'USD',
                status VARCHAR(20) NOT NULL,
                payment_method VARCHAR(50),
                stripe_fee_cents INT DEFAULT 0,
                net_amount_cents INT NOT NULL,
                failure_code VARCHAR(50),
                failure_message TEXT,
                refunded_at TIMESTAMP,
                refund_reason TEXT,
                refund_amount_cents INT,
                created_at TIMESTAMPTZ DEFAULT now()
            )""",
            "CREATE INDEX IF NOT EXISTS idx_payment_history_status ON payment_history(status, created_at)",
            # CREATED FRESH — this one did not exist in production at all.
            # Base shape from scripts/init_db.py (the only prior CREATE)
            # plus the columns phase23_006's ALTER-IF-EXISTS ladder adds,
            # since that migration could never have applied to a table
            # that was never created.
            """CREATE TABLE IF NOT EXISTS subscriptions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                stripe_subscription_id VARCHAR(255) UNIQUE,
                status VARCHAR(50) NOT NULL,
                current_period_start TIMESTAMP,
                current_period_end TIMESTAMP,
                plan_name VARCHAR(50) NOT NULL,
                current_plan_price_cents INT,
                billing_cycle VARCHAR(20),
                auto_renew BOOLEAN DEFAULT TRUE,
                cancel_at_period_end BOOLEAN DEFAULT FALSE,
                cancellation_reason TEXT,
                mrr_cents INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )""",
            "ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS current_plan_price_cents INT",
            "ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS billing_cycle VARCHAR(20)",
            "ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT TRUE",
            "ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT FALSE",
            "ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS cancellation_reason TEXT",
            "ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS mrr_cents INT",
            "ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255)",
            "CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON subscriptions(stripe_subscription_id)",
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