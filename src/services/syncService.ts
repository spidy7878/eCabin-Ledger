/**
 * syncService.ts — Background sync for inspection images
 *
 * Strategy:
 *  • Check network availability before each batch.
 *  • Upload 'pending' rows in batches of BATCH_SIZE.
 *  • On success  → markSynced()
 *  • On failure  → markFailed() (backs off to 'pending' until MAX_RETRIES)
 *  • Never delete files — only clearSynced() does that (user-initiated).
 *
 * Call startSync() whenever:
 *   - App comes to foreground (AppState 'active')
 *   - Network state changes to connected
 *   - User manually taps "Sync now"
 */

import * as Network from "expo-network";
import * as FileSystem from "expo-file-system/legacy";
import { api }       from "./api";
import {
  getUploadable,
  recoverStuckUploads,
  markUploading,
  markSynced,
  markFailed,
} from "../db/imageQueue";

const BATCH_SIZE = 5;  // upload up to 5 images at a time
let _syncing = false;  // prevents concurrent sync runs

export interface SyncResult {
  uploaded: number;
  failed:   number;
  skipped:  number; // no network
}

/**
 * Uploads all pending images in batches. Safe to call multiple times —
 * returns immediately if a sync is already in progress.
 */
export async function startSync(): Promise<SyncResult> {
  if (_syncing) return { uploaded: 0, failed: 0, skipped: 0 };
  _syncing = true;

  const result: SyncResult = { uploaded: 0, failed: 0, skipped: 0 };

  try {
    const net = await Network.getNetworkStateAsync();
    if (!net.isConnected || !net.isInternetReachable) {
      result.skipped = -1; // -1 signals "offline"
      return result;
    }

    // Crash recovery: requeue anything left in 'uploading' from a previous run.
    await recoverStuckUploads();

    // Drain due rows in batches.  getUploadable only returns rows whose backoff
    // window has elapsed, so a persistent error can't spin in a tight loop — the
    // loop ends once nothing is due, and the periodic/network triggers retry the
    // backed-off rows later.
    while (true) {
      const net2 = await Network.getNetworkStateAsync();
      if (!net2.isConnected || !net2.isInternetReachable) break;

      const batch = await getUploadable(BATCH_SIZE);
      if (batch.length === 0) break;

      // Claim the batch so a concurrent trigger can't pick the same rows.
      await Promise.all(batch.map((r) => markUploading(r.id)));

      await Promise.allSettled(
        batch.map(async (row) => {
          try {
            // Never report a missing file as uploaded — surface it as failed.
            const info = await FileSystem.getInfoAsync(row.local_uri);
            if (!info.exists) {
              await markFailed(row.id, "Local image file missing");
              result.failed++;
              return;
            }

            const res = await api.uploadImage({
              localUri:    row.local_uri,
              clientId:    row.client_uuid ?? String(row.id), // idempotency key
              aircraftId:  row.aircraft_id,
              aircraftMsn: row.aircraft_msn,
              zoneType:    row.zone_type,
              zoneId:      row.zone_id,
              zoneName:    row.zone_name,
              partName:    row.part_name,
              issueId:     row.issue_id ?? undefined,
              issueName:   row.issue_name ?? undefined,
              satisfaction: row.satisfaction,
              remarks:     row.remarks ?? undefined,
            });
            await markSynced(row.id, res.serverId);
            result.uploaded++;
          } catch (err: any) {
            await markFailed(row.id, err?.message ?? "Unknown error");
            result.failed++;
          }
        })
      );
    }
  } finally {
    _syncing = false;
  }

  return result;
}

/** Returns true if a sync is currently running. */
export function isSyncing(): boolean {
  return _syncing;
}
