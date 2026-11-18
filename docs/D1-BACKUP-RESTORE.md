# Klypza Backup & Recovery (free workflow)

This workflow uses Cloudflare Wrangler CLI and Google Drive manually. It does **not** require ChatGPT Plus, Cloudflare R2, or a Drive connector.

## Create a private backup

1. Install Node.js (LTS) on your computer if needed.
2. Open a terminal in the Klypza repository checkout.
3. Run once: `npx wrangler login` and complete Cloudflare authorization in your browser.
4. Run the backup script:

   ```bash
   bash scripts/backup-d1.sh
   ```

   If the remote database has a different name, pass it as the first argument, e.g. `bash scripts/backup-d1.sh klypza_accounts`.

5. The script checks authentication, exports the **remote** D1 database, verifies the SQL file is non-empty, and copies the non-secret Worker source/config into a timestamped folder under `backups/private/`.
6. Copy that timestamped folder to your private Google Drive account (`klypza.contact@gmail.com`) under `Klypza Backups/Database`. Keep another local copy if possible.

## Privacy

- SQL dumps contain user/account data. Do not upload them to GitHub, public cloud buckets, or share them.
- Secrets/API keys are not included. Maintain secrets separately in a secure password manager.
- The script does not restore data, change the live database, or deploy anything.

## Restore (manual, only after confirming target)

Do not restore to production without first confirming the target database and taking a fresh backup.

Wrangler's D1 import/restore procedure can vary with database state and Wrangler version. Review the current Cloudflare D1 import documentation and the dump contents first. For a recovery test, prefer a separate staging D1 database rather than overwriting production.

## Suggested Drive structure

- `Klypza Backups/Database/` — timestamped private SQL + backup-info
- `Klypza Backups/Worker & Configuration/` — source/config snapshots
- `Klypza Backups/Pre-Deployment Backups/` — backups made immediately before approved production changes
