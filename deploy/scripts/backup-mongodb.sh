#!/usr/bin/env bash
# ============================================================
# MongoDB Backup for xClaw
# Usage: ./deploy/scripts/backup-mongodb.sh [output_dir]
# Env: MONGODB_URL, BACKUP_RETENTION_DAYS
# ============================================================
set -euo pipefail

BACKUP_DIR="${1:-./backups/mongodb}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FOLDER_NAME="xclaw_mongo_${TIMESTAMP}"

MONGO_URI="${MONGODB_URL:-mongodb://localhost:27017/xclaw}"

mkdir -p "$BACKUP_DIR"

echo "→ Backing up MongoDB..."
mongodump \
  --uri="$MONGO_URI" \
  --out="$BACKUP_DIR/$FOLDER_NAME" \
  --gzip

SIZE=$(du -sh "$BACKUP_DIR/$FOLDER_NAME" | cut -f1)
echo "✓ Backup saved: $BACKUP_DIR/$FOLDER_NAME ($SIZE)"

RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
find "$BACKUP_DIR" -maxdepth 1 -name "xclaw_mongo_*" -type d -mtime +"$RETENTION_DAYS" -exec rm -rf {} + 2>/dev/null || true
echo "✓ Cleaned backups older than $RETENTION_DAYS days"
