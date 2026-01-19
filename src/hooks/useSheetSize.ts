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

const STORAGE_KEY_CONTACT = "contactSheetSize";
const STORAGE_KEY_SESSION = "sessionSheetSize";

export function useSheetSize(type: "contact" | "session") {
  const storageKey = type === "contact" ? STORAGE_KEY_CONTACT : STORAGE_KEY_SESSION;
  const defaultSize: SheetSize = type === "contact" ? "md" : "lg";

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
