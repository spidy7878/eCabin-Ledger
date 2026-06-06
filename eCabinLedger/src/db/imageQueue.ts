/**
 * imageQueue.ts — Offline-first inspection image queue
 *
 * Every image the inspector captures is saved here FIRST before any network
 * activity. The sync service reads this table and uploads rows to the server,
 * updating sync_status as it goes.
 *
 * Data never leaves this queue until the server responds with HTTP 2xx.
 * Local image files are never deleted automatically — inspectors can clear
 * synced images manually to free storage.
 *
 * Schema history:
 *   v1 → v2: added 'attendant' to zone_type CHECK  (drop+recreate, dev-only migration)
 *   v2 → v3: added next_retry_at TEXT, part_id INTEGER  (safe ALTER TABLE)
 */

import * as SQLite from "expo-sqlite";
import * as FileSystem from "expo-file-system/legacy";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ZoneType = "seats" | "galley" | "lavatory" | "attendant";
export type SyncStatus = "pending" | "uploading" | "synced" | "failed";

export interface InspectionImage {
  id:             number;
  inspector_id:   number;
  inspector_name: string;
  aircraft_id:    number;
  aircraft_msn:   string;
  zone_type:      ZoneType;
  zone_id:        number;
  zone_name:      string;
  part_id:        number | null;
  part_name:      string;
  issue_id:       number | null;
  issue_name:     string | null;
  satisfaction:   number;   // 1 = satisfied, 0 = not satisfied
  remarks:        string | null;
  local_uri:      string;   // file:///... absolute path
  file_name:      string;
  file_size:      number | null;
  sync_status:    SyncStatus;
  retry_count:    number;
  next_retry_at:  string | null;  // ISO 8601 — null means "retry any time"
  error_message:  string | null;
  created_at:     string;   // ISO 8601
  synced_at:      string | null;
  server_id:      number | null;
}

export interface AddImageParams extends Omit<InspectionImage,
  "id" | "sync_status" | "retry_count" | "next_retry_at" | "error_message" |
  "created_at" | "synced_at" | "server_id"
> {}

// ── Constants ─────────────────────────────────────────────────────────────────

/** Images are stored here. This directory survives app updates. */
export const IMAGE_DIR = `${FileSystem.documentDirectory}ecabin_inspections/`;

const DB_NAME    = "ecabin_queue.db";
const MAX_RETRIES = 5;

/** Backoff schedule: 1min, 2min, 4min, 8min, 16min (capped at 60min) */
function backoffMs(retryCount: number): number {
  return Math.min(Math.pow(2, retryCount), 60) * 60 * 1000;
}

// ── Database setup ────────────────────────────────────────────────────────────

const SCHEMA_VERSION = 3;

let _db: SQLite.SQLiteDatabase | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync(DB_NAME);
  await _db.execAsync(`PRAGMA journal_mode = WAL;`);

  const versionRow = await _db.getFirstAsync<{ user_version: number }>(`PRAGMA user_version`);
  const current = versionRow?.user_version ?? 0;

  if (current < 2) {
    // v0/v1 → v2: constraint change required drop+recreate  (dev-safe)
    await _db.execAsync(`DROP TABLE IF EXISTS inspection_images;`);
  } else if (current === 2) {
    // v2 → v3: add two nullable columns (ALTER TABLE is safe in SQLite)
    await _db.execAsync(`ALTER TABLE inspection_images ADD COLUMN next_retry_at TEXT;`);
    await _db.execAsync(`ALTER TABLE inspection_images ADD COLUMN part_id INTEGER;`);
  }

  if (current !== SCHEMA_VERSION) {
    await _db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION};`);
  }

  await _db.execAsync(`
    CREATE TABLE IF NOT EXISTS inspection_images (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      inspector_id   INTEGER NOT NULL,
      inspector_name TEXT    NOT NULL,
      aircraft_id    INTEGER NOT NULL,
      aircraft_msn   TEXT    NOT NULL,
      zone_type      TEXT    NOT NULL CHECK(zone_type IN ('seats','galley','lavatory','attendant')),
      zone_id        INTEGER NOT NULL,
      zone_name      TEXT    NOT NULL,
      part_id        INTEGER,
      part_name      TEXT    NOT NULL,
      issue_id       INTEGER,
      issue_name     TEXT,
      satisfaction   INTEGER NOT NULL CHECK(satisfaction IN (0,1)),
      remarks        TEXT,
      local_uri      TEXT    NOT NULL UNIQUE,
      file_name      TEXT    NOT NULL,
      file_size      INTEGER,
      sync_status    TEXT    NOT NULL DEFAULT 'pending'
                     CHECK(sync_status IN ('pending','uploading','synced','failed')),
      retry_count    INTEGER NOT NULL DEFAULT 0,
      next_retry_at  TEXT,
      error_message  TEXT,
      created_at     TEXT    NOT NULL,
      synced_at      TEXT,
      server_id      INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_sync_status
      ON inspection_images(sync_status);
    CREATE INDEX IF NOT EXISTS idx_inspector_aircraft
      ON inspection_images(inspector_id, aircraft_id);
    CREATE INDEX IF NOT EXISTS idx_zone
      ON inspection_images(zone_type, zone_id);
    CREATE INDEX IF NOT EXISTS idx_retry
      ON inspection_images(sync_status, next_retry_at);
  `);
  return _db;
}

// ── Ensure image directory exists ─────────────────────────────────────────────

export async function ensureImageDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(IMAGE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(IMAGE_DIR, { intermediates: true });
  }
}

// ── CRUD operations ───────────────────────────────────────────────────────────

/**
 * Copies a captured image into the app's persistent image directory
 * and inserts a queue record. Returns the new row id.
 *
 * sourceUri  — the temp URI from the camera / image picker
 */
export async function enqueueImage(
  sourceUri: string,
  params: Omit<AddImageParams, "local_uri" | "file_name" | "file_size">
): Promise<number> {
  await ensureImageDir();

  // Stable filename encodes inspector+aircraft+zone+timestamp for debug tracing
  const ts       = Date.now();
  const fileName = `${params.inspector_id}_${params.aircraft_id}_${params.zone_type}_${ts}.jpg`;
  const destUri  = `${IMAGE_DIR}${fileName}`;

  await FileSystem.copyAsync({ from: sourceUri, to: destUri });

  const info = await FileSystem.getInfoAsync(destUri);
  const size = info.exists ? (info as any).size ?? null : null;

  const db  = await getDb();
  const now = new Date().toISOString();

  const result = await db.runAsync(
    `INSERT INTO inspection_images
     (inspector_id, inspector_name, aircraft_id, aircraft_msn,
      zone_type, zone_id, zone_name, part_id, part_name,
      issue_id, issue_name, satisfaction, remarks,
      local_uri, file_name, file_size, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      params.inspector_id, params.inspector_name,
      params.aircraft_id,  params.aircraft_msn,
      params.zone_type,    params.zone_id,   params.zone_name,
      params.part_id ?? null, params.part_name,
      params.issue_id ?? null, params.issue_name ?? null,
      params.satisfaction, params.remarks ?? null,
      destUri, fileName, size, now,
    ]
  );

  return result.lastInsertRowId;
}

/** Returns all rows with the given sync_status, ordered oldest-first. */
export async function getQueueByStatus(status: SyncStatus): Promise<InspectionImage[]> {
  const db = await getDb();
  return db.getAllAsync<InspectionImage>(
    `SELECT * FROM inspection_images WHERE sync_status = ? ORDER BY created_at ASC`,
    [status]
  );
}

/**
 * Returns 'pending' rows that are ready to sync right now.
 * Rows with a future next_retry_at are excluded — they are in their backoff window.
 */
export async function getPendingForSync(): Promise<InspectionImage[]> {
  const db  = await getDb();
  const now = new Date().toISOString();
  return db.getAllAsync<InspectionImage>(
    `SELECT * FROM inspection_images
     WHERE sync_status = 'pending'
       AND (next_retry_at IS NULL OR next_retry_at <= ?)
     ORDER BY created_at ASC`,
    [now]
  );
}

/** Returns all images for a given aircraft + zone (for the UI to display). */
export async function getImagesForZone(
  aircraftId: number,
  zoneType: ZoneType,
  zoneId: number
): Promise<InspectionImage[]> {
  const db = await getDb();
  return db.getAllAsync<InspectionImage>(
    `SELECT * FROM inspection_images
     WHERE aircraft_id = ? AND zone_type = ? AND zone_id = ?
     ORDER BY created_at DESC`,
    [aircraftId, zoneType, zoneId]
  );
}

/** Count of pending + failed images (for the sync badge in the UI). */
export async function getPendingCount(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ n: number }>(
    `SELECT COUNT(*) AS n FROM inspection_images WHERE sync_status IN ('pending','failed')`
  );
  return row?.n ?? 0;
}

/** Mark a row as uploading (prevents duplicate upload attempts). */
export async function markUploading(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE inspection_images SET sync_status='uploading' WHERE id=?`, [id]
  );
}

/** Mark a row as successfully synced. serverId may be null for satisfied inspections. */
export async function markSynced(id: number, serverId: number | null): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE inspection_images
     SET sync_status='synced', server_id=?, synced_at=?, error_message=NULL, next_retry_at=NULL
     WHERE id=?`,
    [serverId ?? null, new Date().toISOString(), id]
  );
}

/**
 * Mark a row as failed and schedule its next retry using exponential backoff.
 * After MAX_RETRIES the row stays permanently 'failed' until manual reset.
 */
export async function markFailed(id: number, errorMsg: string): Promise<void> {
  const db = await getDb();

  const row = await db.getFirstAsync<{ retry_count: number }>(
    `SELECT retry_count FROM inspection_images WHERE id = ?`, [id]
  );
  const newCount = (row?.retry_count ?? 0) + 1;
  const isFinal  = newCount >= MAX_RETRIES;

  const nextRetryAt = isFinal
    ? null
    : new Date(Date.now() + backoffMs(newCount)).toISOString();

  await db.runAsync(
    `UPDATE inspection_images
     SET sync_status   = ?,
         retry_count   = ?,
         error_message = ?,
         next_retry_at = ?
     WHERE id = ?`,
    [isFinal ? "failed" : "pending", newCount, errorMsg, nextRetryAt, id]
  );
}

/** Reset all 'failed' rows back to 'pending' (manual retry by user). */
export async function retryFailed(): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE inspection_images
     SET sync_status='pending', retry_count=0, error_message=NULL, next_retry_at=NULL
     WHERE sync_status='failed'`
  );
}

/** Delete synced rows AND their local files (called manually to free space). */
export async function clearSynced(): Promise<number> {
  const db   = await getDb();
  const rows = await db.getAllAsync<{ id: number; local_uri: string }>(
    `SELECT id, local_uri FROM inspection_images WHERE sync_status='synced'`
  );

  for (const row of rows) {
    await FileSystem.deleteAsync(row.local_uri, { idempotent: true });
  }

  await db.runAsync(`DELETE FROM inspection_images WHERE sync_status='synced'`);
  return rows.length;
}

/** Summary stats for the current inspector. */
export async function getQueueStats(inspectorId: number): Promise<{
  pending: number; uploading: number; synced: number; failed: number; total: number;
}> {
  const db  = await getDb();
  const row = await db.getFirstAsync<{
    pending: number; uploading: number; synced: number; failed: number;
  }>(
    `SELECT
       SUM(CASE WHEN sync_status='pending'   THEN 1 ELSE 0 END) AS pending,
       SUM(CASE WHEN sync_status='uploading' THEN 1 ELSE 0 END) AS uploading,
       SUM(CASE WHEN sync_status='synced'    THEN 1 ELSE 0 END) AS synced,
       SUM(CASE WHEN sync_status='failed'    THEN 1 ELSE 0 END) AS failed
     FROM inspection_images WHERE inspector_id=?`,
    [inspectorId]
  );
  const r = row ?? { pending: 0, uploading: 0, synced: 0, failed: 0 };
  return { ...r, total: r.pending + r.uploading + r.synced + r.failed };
}

/** Approximate local storage used by all cached images (bytes). */
export async function getStorageUsedBytes(): Promise<number> {
  const db  = await getDb();
  const row = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(file_size), 0) AS total FROM inspection_images`
  );
  return row?.total ?? 0;
}
