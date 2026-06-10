import { useState, useEffect, useCallback } from "react";
import { api, InspectionTotals } from "../services/api";
import { getInspectionProgress } from "../db/imageQueue";

export interface ZoneProgress {
  done: number;
  total: number;
}

export interface InspectionProgressResult {
  seats: ZoneProgress;
  galley: ZoneProgress;
  lavatory: ZoneProgress;
  attendant: ZoneProgress;
}

const EMPTY: InspectionProgressResult = {
  seats:     { done: 0, total: 0 },
  galley:    { done: 0, total: 0 },
  lavatory:  { done: 0, total: 0 },
  attendant: { done: 0, total: 0 },
};

const ZERO_TOTALS: InspectionTotals = { seats: 0, galley: 0, lavatory: 0, attendant: 0 };

export function useInspectionProgress(aircraftId: number | undefined) {
  const [progress, setProgress] = useState<InspectionProgressResult>(EMPTY);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    if (!aircraftId) {
      setProgress(EMPTY);
      return;
    }
    Promise.all([
      getInspectionProgress(aircraftId),
      api.getInspectionTotals(aircraftId).catch(() => ZERO_TOTALS),
    ]).then(([done, totals]) => {
      setProgress({
        seats:     { done: done.seats,     total: totals.seats },
        galley:    { done: done.galley,    total: totals.galley },
        lavatory:  { done: done.lavatory,  total: totals.lavatory },
        attendant: { done: done.attendant, total: totals.attendant },
      });
    }).catch(() => {});
  }, [aircraftId, refreshKey]);

  const overall: ZoneProgress = {
    done:  progress.seats.done  + progress.galley.done  + progress.lavatory.done  + progress.attendant.done,
    total: progress.seats.total + progress.galley.total + progress.lavatory.total + progress.attendant.total,
  };

  return { progress, overall, refresh };
}
