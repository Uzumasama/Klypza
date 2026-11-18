#!/usr/bin/env bash
set -euo pipefail

# Klypza D1 backup helper. SQL dumps contain user/account data: never commit or publish them.
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STAMP="$(date -u +%Y%m%d-%H%M%S-UTC)"
DEST="${ROOT}/backups/private/${STAMP}"
DB_NAME="${1:-klypza_accounts}"
WRANGLER_VERSION="4.162.0"

# Run Wrangler from repository root so it consistently finds wrangler.toml.
cd "$ROOT"

mkdir -p "$DEST"
command -v npx >/dev/null 2>&1 || { echo "ERROR: Node.js/npm (npx) is required." >&2; exit 1; }

echo "Checking Wrangler authentication..."
npx --yes wrangler@"$WRANGLER_VERSION" whoami

echo "Exporting remote D1 database: $DB_NAME"
npx --yes wrangler@"$WRANGLER_VERSION" d1 export "$DB_NAME" --remote --output="$DEST/database.sql"

test -s "$DEST/database.sql" || { echo "ERROR: export is missing or empty." >&2; exit 1; }

# Preserve non-secret deployment configuration/source for recovery.
if [ -f "$ROOT/wrangler.toml" ]; then cp "$ROOT/wrangler.toml" "$DEST/wrangler.toml"; fi
if [ -f "$ROOT/cloudflare/worker.mjs" ]; then cp "$ROOT/cloudflare/worker.mjs" "$DEST/worker.mjs"; fi

cat > "$DEST/backup-info.txt" <<INFO
Klypza backup
UTC timestamp: $STAMP
D1 database: $DB_NAME
Contents: database.sql, wrangler.toml (if present), worker.mjs (if present)
WARNING: database.sql contains private user/account data. Keep this folder private.
INFO

echo
echo "Backup created and checked:"
echo "$DEST"
echo "Copy this folder to your private Google Drive backup folder."
echo "Do not commit it to GitHub or share it publicly."
