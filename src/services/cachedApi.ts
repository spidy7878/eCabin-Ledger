/**
 * cachedApi.ts — Network-with-cache fallback for read-only API calls.
 *
 * Each call tries the network first. On success it writes the response to a
 * local JSON file. On a network error (device offline) it reads that file
 * instead. Non-network errors (4xx/5xx from the server) are re-thrown so the
 * UI can surface them normally.
 *
 * Only read-only, reference-data endpoints need this. Write endpoints
 * (login, uploadImage) bypass the cache entirely — they live in api.ts.
 */

import * as FileSystem from "expo-file-system/legacy";
import {
  api,
  Aircraft,
  SubCategory,
  Part,
  IssueType,
  Galley,
  Lavatory,
  AttendantSeat,
  Dashboard,
  InspectionTotals,
} from "./api";

const CACHE_DIR = `${FileSystem.documentDirectory}ecabin_cache/`;

async function ensureCacheDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(CACHE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  }
}

async function write<T>(key: string, data: T): Promise<void> {
  try {
    await ensureCacheDir();
    await FileSystem.writeAsStringAsync(
      `${CACHE_DIR}${key}.json`,
      JSON.stringify(data),
      { encoding: FileSystem.EncodingType.UTF8 }
    );
  } catch {
    // Cache writes are best-effort — never crash the caller.
  }
}

async function read<T>(key: string): Promise<T | null> {
  try {
    const path = `${CACHE_DIR}${key}.json`;
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) return null;
    const json = await FileSystem.readAsStringAsync(path, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

function isNetworkError(e: unknown): boolean {
  const msg = (e as any)?.message ?? "";
  return (
    e instanceof TypeError ||
    /Network request failed|Failed to fetch|NetworkError/i.test(msg)
  );
}

async function withCache<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  try {
    const data = await fetcher();
    await write(key, data);
    return data;
  } catch (e) {
    if (isNetworkError(e)) {
      const cached = await read<T>(key);
      if (cached !== null) return cached;
    }
    throw e;
  }
}

// ── Cached API surface ────────────────────────────────────────────────────────

export const cachedApi = {
  getAircraft: () =>
    withCache<Aircraft[]>("aircraft", () => api.getAircraft()),

  getSubCategories: (catId = "1") =>
    withCache<SubCategory[]>(`subcategories_${catId}`, () =>
      api.getSubCategories(catId)
    ),

  getParts: (subCatId: string, aircraftId: number) =>
    withCache<Part[]>(`parts_${subCatId}_${aircraftId}`, () =>
      api.getParts(subCatId, aircraftId)
    ),

  getIssueTypes: () =>
    withCache<IssueType[]>("issue_types", () => api.getIssueTypes()),

  getGalleys: (aircraftId?: number) =>
    withCache<Galley[]>(
      aircraftId ? `galleys_${aircraftId}` : "galleys_all",
      () => api.getGalleys(aircraftId)
    ),

  getLavatories: (aircraftId?: number) =>
    withCache<Lavatory[]>(
      aircraftId ? `lavatories_${aircraftId}` : "lavatories_all",
      () => api.getLavatories(aircraftId)
    ),

  getAttendantSeats: (aircraftId?: number) =>
    withCache<AttendantSeat[]>(
      aircraftId ? `attendant_seats_${aircraftId}` : "attendant_seats_all",
      () => api.getAttendantSeats(aircraftId)
    ),

  getDashboard: () =>
    withCache<Dashboard>("dashboard", () => api.getDashboard()),

  getInspectionTotals: (aircraftId: number) =>
    withCache<InspectionTotals>(
      `inspection_totals_${aircraftId}`,
      () => api.getInspectionTotals(aircraftId)
    ),
};
