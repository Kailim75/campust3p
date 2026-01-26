import { useState, useEffect } from "react";

export type SheetSize = "sm" | "md" | "lg" | "xl";

interface SheetSizeConfig {
  label: string;
  class: string;
}

export const sheetSizeConfig: Record<SheetSize, SheetSizeConfig> = {
  sm: { label: "Petite", class: "w-full sm:max-w-md" },
  md: { label: "Moyenne", class: "w-full sm:max-w-lg" },
  lg: { label: "Grande", class: "w-full sm:max-w-2xl" },
  xl: { label: "Très grande", class: "w-full sm:max-w-4xl" },
};

const STORAGE_KEYS: Record<string, string> = {
  contact: "contactSheetSize",
  session: "sessionSheetSize",
  prospect: "prospectSheetSize",
};

export function useSheetSize(type: "contact" | "session" | "prospect") {
  const storageKey = STORAGE_KEYS[type] || `${type}SheetSize`;
  const defaultSize: SheetSize = type === "contact" || type === "prospect" ? "md" : "lg";

  const [size, setSize] = useState<SheetSize>(() => {
    if (typeof window === "undefined") return defaultSize;
    const saved = localStorage.getItem(storageKey);
    return (saved as SheetSize) || defaultSize;
  });

  useEffect(() => {
    localStorage.setItem(storageKey, size);
  }, [size, storageKey]);

  return { size, setSize, sizeClass: sheetSizeConfig[size].class };
}
