#!/bin/bash
# Automated database backup
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backup_${DATE}.sql"

if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL not set"
    exit 1
fi

pg_dump "$DATABASE_URL" > "$BACKUP_FILE"
echo "✅ Database backup created: $BACKUP_FILE"
