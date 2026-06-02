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
import { api }       from "./api";
import {
  getQueueByStatus,
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

    // Also process rows that were stuck in 'uploading' state
    // (e.g., app crashed mid-upload — reset them to pending first)
    const stuckUploading = await getQueueByStatus("uploading");
    for (const row of stuckUploading) {
      await markFailed(row.id, "Upload interrupted — will retry");
    }

    let page = await getQueueByStatus("pending");

    while (page.length > 0) {
      const batch = page.slice(0, BATCH_SIZE);

      // Mark as uploading atomically before attempting
      await Promise.all(batch.map((r) => markUploading(r.id)));

      // Upload in parallel within the batch
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

      // Re-check network before next batch
      const net2 = await Network.getNetworkStateAsync();
      if (!net2.isConnected) break;

      // Get next page
      const remaining = await getQueueByStatus("pending");
      page = remaining;
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
