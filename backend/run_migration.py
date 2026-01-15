#!/usr/bin/env python3
"""
DeedPro Database Migration Runner

Usage:
    python run_migration.py                           # Run all pending migrations
    python run_migration.py <migration_file.sql>     # Run a specific migration
    python run_migration.py --list                   # List all migrations and their status
    python run_migration.py --reset                  # Reset migration tracking (dangerous!)

Environment:
    DATABASE_URL - PostgreSQL connection string (required)
    
Example:
    set DATABASE_URL=postgresql://user:pass@host/db
    python run_migration.py migrations/add_sharing_enhancements.sql
"""

import os
import sys
import glob
import hashlib
from datetime import datetime
from pathlib import Path

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
except ImportError:
    print("[!] psycopg2 not installed. Installing...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "psycopg2-binary"])
    import psycopg2
    from psycopg2.extras import RealDictCursor


# Default database URL (can be overridden by environment variable)
DEFAULT_DATABASE_URL = "postgresql://deedpro_user:4MkRMdYMHnnoUwvD03rI3kVfjMLwV6j3@dpg-d208q5umcj7s73as68g0-a.ohio-postgres.render.com/deedpro"

MIGRATIONS_DIR = Path(__file__).parent / "migrations"


def get_database_url():
    """Get database URL from environment or use default."""
    url = os.getenv("DATABASE_URL", DEFAULT_DATABASE_URL)
    if not url:
        print("[ERROR] DATABASE_URL environment variable not set and no default available.")
        print("        Set it with: set DATABASE_URL=postgresql://user:pass@host/db")
        sys.exit(1)
    return url


def get_connection():
    """Create database connection."""
    url = get_database_url()
    # Mask password in output
    display_url = url.split('@')[-1] if '@' in url else url
    print(f"[*] Connecting to database: ...@{display_url}")
    try:
        conn = psycopg2.connect(url)
        conn.autocommit = False
        print("[OK] Connected successfully")
        return conn
    except Exception as e:
        print(f"[ERROR] Connection failed: {e}")
        sys.exit(1)


def ensure_migrations_table(conn):
    """Create migrations tracking table if it doesn't exist."""
    with conn.cursor() as cur:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS _migrations (
                id SERIAL PRIMARY KEY,
                filename VARCHAR(255) NOT NULL UNIQUE,
                checksum VARCHAR(64) NOT NULL,
                applied_at TIMESTAMPTZ DEFAULT NOW(),
                success BOOLEAN DEFAULT TRUE,
                error_message TEXT
            )
        """)
        conn.commit()
        print("[OK] Migrations table ready")


def get_file_checksum(filepath):
    """Calculate MD5 checksum of a file."""
    with open(filepath, 'rb') as f:
        return hashlib.md5(f.read()).hexdigest()


def get_applied_migrations(conn):
    """Get list of already applied migrations."""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("SELECT filename, checksum, applied_at, success FROM _migrations ORDER BY applied_at")
        return {row['filename']: row for row in cur.fetchall()}


def run_migration(conn, filepath):
    """Execute a single migration file."""
    filename = os.path.basename(filepath)
    checksum = get_file_checksum(filepath)
    
    print(f"\n{'='*60}")
    print(f"[>] Running: {filename}")
    print(f"    Checksum: {checksum[:12]}...")
    print(f"{'='*60}")
    
    # Read SQL content
    with open(filepath, 'r', encoding='utf-8') as f:
        sql_content = f.read()
    
    # Split into statements (handle both ; and GO separators)
    statements = []
    current = []
    for line in sql_content.split('\n'):
        stripped = line.strip()
        if stripped.upper() == 'GO' or (stripped.endswith(';') and not stripped.startswith('--')):
            current.append(line)
            statements.append('\n'.join(current))
            current = []
        else:
            current.append(line)
    if current:
        statements.append('\n'.join(current))
    
    # Filter out empty statements and comments-only statements
    statements = [s.strip() for s in statements if s.strip() and not all(
        line.strip().startswith('--') or not line.strip() 
        for line in s.split('\n')
    )]
    
    try:
        with conn.cursor() as cur:
            for i, stmt in enumerate(statements, 1):
                if not stmt.strip():
                    continue
                    
                # Show first line of statement
                first_line = stmt.strip().split('\n')[0][:60]
                print(f"    [{i}/{len(statements)}] {first_line}...")
                
                try:
                    cur.execute(stmt)
                except psycopg2.Error as e:
                    # Some errors are OK (like "already exists")
                    error_msg = str(e)
                    if 'already exists' in error_msg.lower():
                        print(f"    [SKIP] Already exists")
                        conn.rollback()
                        continue
                    else:
                        raise
            
            # Record successful migration
            cur.execute("""
                INSERT INTO _migrations (filename, checksum, success)
                VALUES (%s, %s, TRUE)
                ON CONFLICT (filename) DO UPDATE SET
                    checksum = EXCLUDED.checksum,
                    applied_at = NOW(),
                    success = TRUE,
                    error_message = NULL
            """, (filename, checksum))
            
            conn.commit()
            print(f"\n[OK] Migration {filename} applied successfully!")
            return True
            
    except Exception as e:
        conn.rollback()
        print(f"\n[ERROR] Migration {filename} FAILED: {e}")
        
        # Record failed migration
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO _migrations (filename, checksum, success, error_message)
                    VALUES (%s, %s, FALSE, %s)
                    ON CONFLICT (filename) DO UPDATE SET
                        checksum = EXCLUDED.checksum,
                        applied_at = NOW(),
                        success = FALSE,
                        error_message = EXCLUDED.error_message
                """, (filename, checksum, str(e)))
                conn.commit()
        except:
            pass
            
        return False


def list_migrations(conn):
    """List all migrations and their status."""
    applied = get_applied_migrations(conn)
    
    # Get all migration files
    migration_files = sorted(glob.glob(str(MIGRATIONS_DIR / "*.sql")))
    
    print(f"\n{'='*80}")
    print(f"{'Migration':<50} {'Status':<12} {'Applied At':<20}")
    print(f"{'='*80}")
    
    for filepath in migration_files:
        filename = os.path.basename(filepath)
        
        if filename in applied:
            info = applied[filename]
            status = "[OK]" if info['success'] else "[FAIL]"
            applied_at = info['applied_at'].strftime("%Y-%m-%d %H:%M") if info['applied_at'] else "N/A"
        else:
            status = "[PENDING]"
            applied_at = "-"
        
        print(f"{filename:<50} {status:<12} {applied_at:<20}")
    
    print(f"{'='*80}")
    print(f"Total: {len(migration_files)} migrations, {len(applied)} applied")


def run_all_pending(conn):
    """Run all pending migrations in order."""
    applied = get_applied_migrations(conn)
    
    # Get all migration files sorted by name
    migration_files = sorted(glob.glob(str(MIGRATIONS_DIR / "*.sql")))
    
    pending = [f for f in migration_files if os.path.basename(f) not in applied]
    
    if not pending:
        print("\n[OK] All migrations are up to date!")
        return True
    
    print(f"\n[*] Found {len(pending)} pending migration(s)")
    
    success_count = 0
    for filepath in pending:
        if run_migration(conn, filepath):
            success_count += 1
        else:
            print(f"\n[!] Stopping due to failed migration")
            break
    
    print(f"\n{'='*60}")
    print(f"Summary: {success_count}/{len(pending)} migrations applied successfully")
    return success_count == len(pending)


def main():
    args = sys.argv[1:]
    
    print("\n" + "="*60)
    print("  DeedPro Database Migration Runner")
    print("="*60)
    
    conn = get_connection()
    ensure_migrations_table(conn)
    
    try:
        if not args:
            # Run all pending migrations
            success = run_all_pending(conn)
            sys.exit(0 if success else 1)
            
        elif args[0] == "--list":
            list_migrations(conn)
            
        elif args[0] == "--reset":
            confirm = input("[!] This will reset migration tracking. Type 'yes' to confirm: ")
            if confirm.lower() == 'yes':
                with conn.cursor() as cur:
                    cur.execute("DROP TABLE IF EXISTS _migrations")
                    conn.commit()
                print("[OK] Migration tracking reset")
            else:
                print("[X] Cancelled")
                
        else:
            # Run specific migration file
            filepath = args[0]
            if not os.path.exists(filepath):
                # Try relative to migrations directory
                filepath = str(MIGRATIONS_DIR / args[0])
            
            if not os.path.exists(filepath):
                print(f"[ERROR] Migration file not found: {args[0]}")
                sys.exit(1)
            
            success = run_migration(conn, filepath)
            sys.exit(0 if success else 1)
            
    finally:
        conn.close()
        print("\n[*] Connection closed")


if __name__ == "__main__":
    main()
