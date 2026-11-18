-- Credit Confirmation V2 (feature branch only; NOT applied to production D1)
-- Reservation rows temporarily occupy daily and batch quota slots. Charges are recorded
-- separately and are unique per user + canonical source identity (quality-independent).
CREATE TABLE IF NOT EXISTS download_reservations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  batch_id TEXT NOT NULL,
  usage_date TEXT NOT NULL,
  platform TEXT NOT NULL,
  source_identity TEXT NOT NULL,
  source_url TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL CHECK (status IN ('reserved','confirmed','released','expired')),
  token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  confirmed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_download_reservations_user_day_status
  ON download_reservations(user_id, usage_date, status);
CREATE INDEX IF NOT EXISTS idx_download_reservations_batch_status
  ON download_reservations(user_id, batch_id, status);
CREATE INDEX IF NOT EXISTS idx_download_reservations_expiry
  ON download_reservations(status, expires_at);

CREATE TABLE IF NOT EXISTS confirmed_download_charges (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  source_identity TEXT NOT NULL,
  reservation_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  source_url TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  charged_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, source_identity),
  UNIQUE(reservation_id)
);
CREATE INDEX IF NOT EXISTS idx_confirmed_download_charges_user
  ON confirmed_download_charges(user_id, charged_at);
