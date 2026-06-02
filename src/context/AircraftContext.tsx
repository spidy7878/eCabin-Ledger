import React, { createContext, useContext, useState } from "react";
import type { Aircraft } from "../services/api";

interface AircraftContextValue {
  selectedAircraft: Aircraft | null;
  setSelectedAircraft: (a: Aircraft | null) => void;
}

const AircraftContext = createContext<AircraftContextValue>({
  selectedAircraft: null,
  setSelectedAircraft: () => {},
});

export function AircraftProvider({ children }: { children: React.ReactNode }) {
  const [selectedAircraft, setSelectedAircraft] = useState<Aircraft | null>(null);
  return (
    <AircraftContext.Provider value={{ selectedAircraft, setSelectedAircraft }}>
      {children}
    </AircraftContext.Provider>
  );
}

export const useAircraft = () => useContext(AircraftContext);
