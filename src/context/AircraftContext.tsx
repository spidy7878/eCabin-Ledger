import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api, Aircraft } from "../services/api";
import { useAuth } from "./AuthContext";

interface AircraftContextValue {
  /** The aircraft assigned to the signed-in inspector (from InspectionDet). */
  aircraftList: Aircraft[];
  selectedAircraft: Aircraft | null;
  setSelectedAircraft: (a: Aircraft | null) => void;
  loadingAircraft: boolean;
  error: string | null;
  /** Re-fetch the assigned aircraft (e.g. pull-to-refresh). */
  refreshAircraft: () => Promise<Aircraft[]>;
}

const AircraftContext = createContext<AircraftContextValue>({
  aircraftList: [],
  selectedAircraft: null,
  setSelectedAircraft: () => {},
  loadingAircraft: false,
  error: null,
  refreshAircraft: async () => [],
});

export function AircraftProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [aircraftList, setAircraftList] = useState<Aircraft[]>([]);
  const [selectedAircraft, setSelectedAircraft] = useState<Aircraft | null>(null);
  const [loadingAircraft, setLoadingAircraft] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load the inspector's assigned aircraft once, here in the provider — so the
  // selection is available to EVERY screen (Galley/Lavatory/Attendant gate their
  // fetches on selectedAircraft) and does not depend on the Home screen, or on
  // any other request (e.g. the dashboard) succeeding.
  const refreshAircraft = useCallback(async () => {
    setLoadingAircraft(true);
    setError(null);
    try {
      const list = await api.getAircraft();
      setAircraftList(list);
      // Keep the current selection if it's still valid; otherwise default to the
      // first assigned aircraft so the zone screens have something to fetch.
      setSelectedAircraft((prev) =>
        prev && list.some((a) => a.AircraftId === prev.AircraftId) ? prev : list[0] ?? null
      );
      return list;
    } catch (e: any) {
      setError(e?.message ?? "Failed to load aircraft.");
      return [];
    } finally {
      setLoadingAircraft(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      refreshAircraft();
    } else {
      setAircraftList([]);
      setSelectedAircraft(null);
    }
  }, [user, refreshAircraft]);

  return (
    <AircraftContext.Provider
      value={{
        aircraftList,
        selectedAircraft,
        setSelectedAircraft,
        loadingAircraft,
        error,
        refreshAircraft,
      }}
    >
      {children}
    </AircraftContext.Provider>
  );
}

export const useAircraft = () => useContext(AircraftContext);
