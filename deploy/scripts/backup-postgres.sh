#!/usr/bin/env bash
# ============================================================
# PostgreSQL Backup for xClaw
# Usage: ./deploy/scripts/backup-postgres.sh [output_dir]
# Env: PG_HOST, PG_PORT, PG_USER, PG_PASSWORD, PG_DB, BACKUP_RETENTION_DAYS
# ============================================================
set -euo pipefail

BACKUP_DIR="${1:-./backups/postgres}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="xclaw_pg_${TIMESTAMP}.dump"

DB_HOST="${PG_HOST:-localhost}"
DB_PORT="${PG_PORT:-5432}"
DB_USER="${PG_USER:-xclaw}"
DB_NAME="${PG_DB:-xclaw}"

mkdir -p "$BACKUP_DIR"

echo "→ Backing up PostgreSQL ($DB_HOST:$DB_PORT/$DB_NAME)..."
PGPASSWORD="${PG_PASSWORD:-xclaw}" pg_dump \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  -Fc \
  --no-owner \
  --no-acl \
  -f "$BACKUP_DIR/$FILENAME"

SIZE=$(du -sh "$BACKUP_DIR/$FILENAME" | cut -f1)
echo "✓ Backup saved: $BACKUP_DIR/$FILENAME ($SIZE)"

RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
find "$BACKUP_DIR" -name "xclaw_pg_*.dump" -mtime +"$RETENTION_DAYS" -delete 2>/dev/null || true
echo "✓ Cleaned backups older than $RETENTION_DAYS days"
