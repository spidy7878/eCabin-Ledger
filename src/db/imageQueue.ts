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
 */

import * as SQLite from "expo-sqlite";
import * as FileSystem from "expo-file-system/legacy";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ZoneType = "seats" | "galley" | "lavatory" | "attendant";
export type SyncStatus = "pending" | "uploading" | "synced" | "failed";

export interface InspectionImage {
  id:            number;
  inspector_id:  number;
  inspector_name:string;
  aircraft_id:   number;
  aircraft_msn:  string;
  zone_type:     ZoneType;
  zone_id:       number;
  zone_name:     string;
  part_name:     string;
  issue_id:      number | null;
  issue_name:    string | null;
  satisfaction:  number;   // 1 = satisfied, 0 = not satisfied
  remarks:       string | null;
  local_uri:     string;   // file:///... absolute path
  file_name:     string;
  file_size:     number | null;
  sync_status:   SyncStatus;
  retry_count:   number;
  error_message: string | null;
  created_at:    string;   // ISO 8601
  synced_at:     string | null;
  server_id:     number | null;
  client_uuid:   string | null;  // globally-unique idempotency key (dedupes server-side)
  next_retry_at: string | null;  // ISO 8601 — don't retry before this (exponential backoff); null = now
}

export interface AddImageParams extends Omit<InspectionImage,
  "id" | "sync_status" | "retry_count" | "error_message" | "created_at" | "synced_at"
  | "server_id" | "client_uuid" | "next_retry_at"
> {}

// ── Constants ─────────────────────────────────────────────────────────────────

/** Images are stored here. This directory survives app updates. */
export const IMAGE_DIR = `${FileSystem.documentDirectory}ecabin_inspections/`;

const DB_NAME = "ecabin_queue.db";

/** After this many failures a row is shown as 'failed' in the UI — but it is
 *  NEVER abandoned: it keeps auto-retrying on the capped backoff below. */
const MAX_RETRIES = 5;

/** Exponential backoff (minutes) between upload attempts, capped at 32 min. */
const BACKOFF_MINUTES = [1, 2, 4, 8, 16, 32];

function nextRetryIso(retryCount: number): string {
  const idx = Math.min(retryCount, BACKOFF_MINUTES.length - 1);
  return new Date(Date.now() + BACKOFF_MINUTES[idx] * 60_000).toISOString();
}

/** RFC4122-v4-style id — sufficient as a globally-unique idempotency key so the
 *  server can dedupe a re-uploaded image after a lost response. */
function genUuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ── Database setup ────────────────────────────────────────────────────────────

/**
 * Current schema version.
 *
 * ⚠️  ZERO-DATA-LOSS RULE: migrations are ADDITIVE and DATA-PRESERVING.
 * This table holds inspection images that have NOT yet been uploaded, so a
 * migration must NEVER `DROP TABLE` or otherwise delete rows.  To change the
 * shape, add a numbered migration in `runMigrations()` that either
 * `ALTER TABLE ADD COLUMN` or rebuilds the table while COPYING every row.
 */
const SCHEMA_VERSION = 3;

const CREATE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS inspection_images (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    inspector_id   INTEGER NOT NULL,
    inspector_name TEXT    NOT NULL,
    aircraft_id    INTEGER NOT NULL,
    aircraft_msn   TEXT    NOT NULL,
    zone_type      TEXT    NOT NULL CHECK(zone_type IN ('seats','galley','lavatory','attendant')),
    zone_id        INTEGER NOT NULL,
    zone_name      TEXT    NOT NULL,
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
    error_message  TEXT,
    created_at     TEXT    NOT NULL,
    synced_at      TEXT,
    server_id      INTEGER,
    client_uuid    TEXT,
    next_retry_at  TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_sync_status       ON inspection_images(sync_status);
  CREATE INDEX IF NOT EXISTS idx_inspector_aircraft ON inspection_images(inspector_id, aircraft_id);
  CREATE INDEX IF NOT EXISTS idx_zone               ON inspection_images(zone_type, zone_id);
`;

let _dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function columnExists(db: SQLite.SQLiteDatabase, column: string): Promise<boolean> {
  const cols = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(inspection_images)`);
  return cols.some((c) => c.name === column);
}

/**
 * Applies forward-only, data-preserving migrations.  Each step must leave every
 * existing row intact.  Add new `if (version < N)` blocks here for future
 * changes; never drop the table.
 */
async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>(`PRAGMA user_version`);
  const version = row?.user_version ?? 0;

  // v2 → v3: idempotency key + retry backoff.  ADD COLUMN preserves every row.
  // Guarded by columnExists so this is always safe to re-run.
  if (!(await columnExists(db, "client_uuid"))) {
    await db.execAsync(`ALTER TABLE inspection_images ADD COLUMN client_uuid TEXT`);
  }
  if (!(await columnExists(db, "next_retry_at"))) {
    await db.execAsync(`ALTER TABLE inspection_images ADD COLUMN next_retry_at TEXT`);
  }

  // Backfill an idempotency key for any pre-existing rows that don't have one,
  // so every queued image can be deduped server-side on retry.
  const missing = await db.getAllAsync<{ id: number }>(
    `SELECT id FROM inspection_images WHERE client_uuid IS NULL OR client_uuid = ''`
  );
  for (const r of missing) {
    await db.runAsync(`UPDATE inspection_images SET client_uuid = ? WHERE id = ?`, [genUuid(), r.id]);
  }

  // Unique idempotency index (NULLs are distinct in SQLite, so safe to create
  // even if a stray NULL slipped through).
  await db.execAsync(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_client_uuid ON inspection_images(client_uuid)`
  );

  if (version !== SCHEMA_VERSION) {
    await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION};`);
  }
}

async function openAndInit(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  // WAL = durable, crash-safe writes (a power loss mid-write can't corrupt the DB).
  await db.execAsync(`PRAGMA journal_mode = WAL;`);
  await db.execAsync(`PRAGMA synchronous = NORMAL;`);

  // Create on fresh installs; existing installs keep their rows untouched.
  await db.execAsync(CREATE_TABLE_SQL);
  await runMigrations(db);

  return db;
}

/**
 * Returns the singleton DB handle, opening + migrating it exactly once.
 *
 * ⚠️  We cache the in-flight PROMISE, not the resolved database.  The screens
 * fire several queries concurrently on mount (getImagesForZone, the progress
 * hook, enqueueImage on submit, …); if we cached only the resolved value, every
 * one of those callers would see `null` before the first open finished and each
 * would call `openDatabaseAsync` itself — multiple connections racing on the
 * WAL switch + ALTER TABLE migrations against the same file.  That race leaves a
 * half-initialised native handle and surfaces on a real device as
 * "NativeDatabase.prepareAsync has been rejected … NullPointerException".
 * Sharing one promise serialises open+migrate for all callers.
 */
function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!_dbPromise) {
    _dbPromise = openAndInit().catch((e) => {
      // Don't cache a failed init — let a later call retry from scratch.
      _dbPromise = null;
      throw e;
    });
  }
  return _dbPromise;
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

  const clientUuid = genUuid();

  // Filename includes the uuid so two captures in the same millisecond can't
  // collide: <inspectorId>_<aircraftId>_<zone>_<timestamp>_<uuid8>.jpg
  const ts       = Date.now();
  const fileName = `${params.inspector_id}_${params.aircraft_id}_${params.zone_type}_${ts}_${clientUuid.slice(0, 8)}.jpg`;
  const destUri  = `${IMAGE_DIR}${fileName}`;

  // Copy from the camera temp dir into persistent storage, then VERIFY the copy
  // landed and is non-empty.  A half-written/empty file must never be queued —
  // better to fail loudly so the inspector retakes the shot than to silently
  // queue an unusable image.
  await FileSystem.copyAsync({ from: sourceUri, to: destUri });
  const info = await FileSystem.getInfoAsync(destUri);
  const size = info.exists ? ((info as any).size ?? 0) : 0;
  if (!info.exists || !size) {
    await FileSystem.deleteAsync(destUri, { idempotent: true });
    throw new Error("Image could not be saved to device storage. Please retake the photo.");
  }

  const db  = await getDb();
  const now = new Date().toISOString();

  try {
    const result = await db.runAsync(
      `INSERT INTO inspection_images
       (inspector_id, inspector_name, aircraft_id, aircraft_msn,
        zone_type, zone_id, zone_name, part_name,
        issue_id, issue_name, satisfaction, remarks,
        local_uri, file_name, file_size, created_at, client_uuid)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        params.inspector_id, params.inspector_name,
        params.aircraft_id,  params.aircraft_msn,
        params.zone_type,    params.zone_id,   params.zone_name, params.part_name,
        params.issue_id ?? null,  params.issue_name ?? null,
        params.satisfaction, params.remarks ?? null,
        destUri, fileName, size, now, clientUuid,
      ]
    );
    return result.lastInsertRowId;
  } catch (e) {
    // DB insert failed — roll back the copied file so no orphan is left behind.
    await FileSystem.deleteAsync(destUri, { idempotent: true });
    throw e;
  }
}

/** Returns all rows with the given sync_status, ordered oldest-first. */
export async function getQueueByStatus(status: SyncStatus): Promise<InspectionImage[]> {
  const db = await getDb();
  return db.getAllAsync<InspectionImage>(
    `SELECT * FROM inspection_images WHERE sync_status = ? ORDER BY created_at ASC`,
    [status]
  );
}

/** Returns submitted images for a specific aircraft + zone + part (for per-item status display). */
export async function getImagesForItem(
  aircraftId: number,
  zoneType: ZoneType,
  zoneId: number,
  partName: string
): Promise<InspectionImage[]> {
  const db = await getDb();
  return db.getAllAsync<InspectionImage>(
    `SELECT * FROM inspection_images
     WHERE aircraft_id = ? AND zone_type = ? AND zone_id = ? AND part_name = ?
     ORDER BY created_at DESC`,
    [aircraftId, zoneType, zoneId, partName]
  );
}

/** Deletes a single image row and its local file (used when inspector removes a submitted photo). */
export async function deleteImage(id: number): Promise<void> {
  const db  = await getDb();
  const row = await db.getFirstAsync<{ local_uri: string }>(
    `SELECT local_uri FROM inspection_images WHERE id = ?`, [id]
  );
  if (row?.local_uri) {
    await FileSystem.deleteAsync(row.local_uri, { idempotent: true });
  }
  await db.runAsync(`DELETE FROM inspection_images WHERE id = ?`, [id]);
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
     SET sync_status='synced', server_id=?, synced_at=?, error_message=NULL
     WHERE id=?`,
    [serverId ?? null, new Date().toISOString(), id]
  );
}

/**
 * Records a failed upload attempt and schedules the next retry with exponential
 * backoff.  The image is NEVER abandoned — after MAX_RETRIES it is surfaced as
 * 'failed' in the UI for visibility, but it still keeps auto-retrying on the
 * capped backoff (getUploadable picks up due 'failed' rows too).
 */
export async function markFailed(id: number, errorMsg: string): Promise<void> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ retry_count: number }>(
    `SELECT retry_count FROM inspection_images WHERE id = ?`, [id]
  );
  const newCount = (row?.retry_count ?? 0) + 1;
  const status   = newCount >= MAX_RETRIES ? "failed" : "pending";
  await db.runAsync(
    `UPDATE inspection_images
     SET sync_status = ?, retry_count = ?, error_message = ?, next_retry_at = ?
     WHERE id = ?`,
    [status, newCount, errorMsg, nextRetryIso(newCount), id]
  );
}

/**
 * Returns the next batch of images that are due for upload — both 'pending' and
 * repeatedly-'failed' rows whose backoff window has elapsed — oldest first.
 * Using a LIMIT keeps memory bounded regardless of queue size.
 */
export async function getUploadable(limit: number): Promise<InspectionImage[]> {
  const db  = await getDb();
  const now = new Date().toISOString();
  return db.getAllAsync<InspectionImage>(
    `SELECT * FROM inspection_images
     WHERE sync_status IN ('pending','failed')
       AND (next_retry_at IS NULL OR next_retry_at <= ?)
     ORDER BY created_at ASC
     LIMIT ?`,
    [now, limit]
  );
}

/**
 * Crash recovery: any rows stuck in 'uploading' (app killed mid-upload) are put
 * back to 'pending' for immediate retry.  Server-side idempotency (client_uuid)
 * makes a re-upload safe even if the original actually committed.
 * Returns the number of rows recovered.
 */
export async function recoverStuckUploads(): Promise<number> {
  const db  = await getDb();
  const res = await db.runAsync(
    `UPDATE inspection_images
     SET sync_status = 'pending', next_retry_at = NULL,
         error_message = 'Recovered after interrupted upload'
     WHERE sync_status = 'uploading'`
  );
  return res.changes ?? 0;
}

/** Reset all 'failed' rows back to 'pending' (manual retry by user). */
export async function retryFailed(): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE inspection_images SET sync_status='pending', retry_count=0,
       error_message=NULL, next_retry_at=NULL
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

/**
 * Returns how many distinct (zone_id, part_name) pairs have been submitted
 * per zone type for a given aircraft — used for progress bar "done" counts.
 */
export async function getInspectionProgress(aircraftId: number): Promise<{
  seats: number; galley: number; lavatory: number; attendant: number;
}> {
  const db   = await getDb();
  const rows = await db.getAllAsync<{ zone_type: string; done: number }>(
    `SELECT zone_type,
            COUNT(DISTINCT CAST(zone_id AS TEXT) || '|' || part_name) AS done
     FROM inspection_images
     WHERE aircraft_id = ?
     GROUP BY zone_type`,
    [aircraftId]
  );
  const result = { seats: 0, galley: 0, lavatory: 0, attendant: 0 };
  for (const r of rows) {
    if (r.zone_type in result) (result as Record<string, number>)[r.zone_type] = r.done;
  }
  return result;
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
