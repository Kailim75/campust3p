import { useState, useEffect, useCallback } from "react";

export interface CrmCustomization {
  primaryColor: string;
  ctaColor: string;
  sidebarStyle: "dark" | "light";
  fontFamily: "inter" | "system" | "roboto" | "poppins";
  borderRadius: "sharp" | "default" | "rounded" | "pill";
  density: "compact" | "default" | "comfortable";
}

const STORAGE_KEY = "crm-customization";

const defaults: CrmCustomization = {
  primaryColor: "222 47% 11%",
  ctaColor: "173 58% 39%",
  sidebarStyle: "dark",
  fontFamily: "inter",
  borderRadius: "default",
  density: "default",
};

const FONT_MAP: Record<CrmCustomization["fontFamily"], string> = {
  inter: "'Inter', system-ui, -apple-system, sans-serif",
  system: "system-ui, -apple-system, sans-serif",
  roboto: "'Roboto', system-ui, sans-serif",
  poppins: "'Poppins', system-ui, sans-serif",
};

const RADIUS_MAP: Record<CrmCustomization["borderRadius"], string> = {
  sharp: "0.25rem",
  default: "0.75rem",
  rounded: "1rem",
  pill: "1.5rem",
};

const DENSITY_SCALE: Record<CrmCustomization["density"], string> = {
  compact: "0.85",
  default: "1",
  comfortable: "1.15",
};

function applyCustomization(config: CrmCustomization) {
  const root = document.documentElement;
  root.style.setProperty("--primary", config.primaryColor);
  root.style.setProperty("--cta", config.ctaColor);
  root.style.setProperty("--ring", config.ctaColor);
  root.style.setProperty("--radius", RADIUS_MAP[config.borderRadius]);
  root.style.setProperty("--density-scale", DENSITY_SCALE[config.density]);
  document.body.style.fontFamily = FONT_MAP[config.fontFamily];
}

export function useCrmCustomization() {
  const [config, setConfig] = useState<CrmCustomization>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return { ...defaults, ...JSON.parse(stored) };
    } catch {}
    return defaults;
  });

  useEffect(() => {
    applyCustomization(config);
  }, [config]);

  const update = useCallback((partial: Partial<CrmCustomization>) => {
    setConfig((prev) => {
      const next = { ...prev, ...partial };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setConfig(defaults);
  }, []);

  return { config, update, reset, defaults };
}
