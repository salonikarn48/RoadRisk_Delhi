import React, { createContext, useContext, useState } from "react";

export interface AreaContextType {
  selectedZone: string;
  setSelectedZone: (zone: string) => void;
}

const AreaContext = createContext<AreaContextType>({
  selectedZone: "Central Delhi (Default)",
  setSelectedZone: () => {},
});

export const AreaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedZone, setSelectedZone] = useState<string>("Central Delhi (Default)");

  return (
    <AreaContext.Provider value={{ selectedZone, setSelectedZone }}>
      {children}
    </AreaContext.Provider>
  );
};

export const useArea = () => useContext(AreaContext);
