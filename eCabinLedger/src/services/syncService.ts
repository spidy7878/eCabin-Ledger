/**
 * syncService.ts — Background sync for inspection images
 *
 * Strategy:
 *  • Check network availability before each batch.
 *  • Upload 'pending' rows that are past their backoff window in batches of BATCH_SIZE.
 *  • On success  → markSynced()
 *  • On failure  → markFailed() (exponential backoff: 1, 2, 4, 8, 16 min)
 *  • After MAX_RETRIES failures the row becomes permanently 'failed' until retryFailed().
 *  • Never delete files — only clearSynced() does that (user-initiated).
 *
 * Call startSync() whenever:
 *   - App comes to foreground (AppState 'active')
 *   - Network state changes to connected  (handled in AppNavigator)
 *   - User manually taps "Sync now"
 */

import * as Network from "expo-network";
import { api }       from "./api";
import {
  getPendingForSync,
  getQueueByStatus,
  markUploading,
  markSynced,
  markFailed,
} from "../db/imageQueue";

const BATCH_SIZE = 10;  // upload up to 10 images concurrently
let _syncing = false;   // prevents concurrent sync runs

export interface SyncResult {
  uploaded: number;
  failed:   number;
  skipped:  number;  // -1 = offline, >0 = rows still in backoff
}

/**
 * Uploads all pending images (past their backoff window) in batches.
 * Safe to call multiple times — returns immediately if already syncing.
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

    // Reset rows stuck in 'uploading' state (app crashed mid-upload)
    const stuckUploading = await getQueueByStatus("uploading");
    for (const row of stuckUploading) {
      await markFailed(row.id, "Upload interrupted — will retry");
    }

    let page = await getPendingForSync();

    while (page.length > 0) {
      const batch = page.slice(0, BATCH_SIZE);

      // Atomically mark as 'uploading' before attempting to prevent double-upload
      await Promise.all(batch.map((r) => markUploading(r.id)));

      await Promise.allSettled(
        batch.map(async (row) => {
          try {
            const res = await api.uploadImage({
              localUri:    row.local_uri,
              clientId:    String(row.id),
              aircraftId:  row.aircraft_id,
              aircraftMsn: row.aircraft_msn,
              zoneType:    row.zone_type,
              zoneId:      row.zone_id,
              zoneName:    row.zone_name,
              partId:      row.part_id ?? undefined,
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

      // Re-check network after each batch
      const net2 = await Network.getNetworkStateAsync();
      if (!net2.isConnected || !net2.isInternetReachable) break;

      page = await getPendingForSync();
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
