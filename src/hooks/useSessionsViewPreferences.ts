import { useState, useEffect, useCallback } from "react";

export type ViewMode = "list" | "calendar" | "kanban";
export type GroupByMode = "none" | "formation" | "status" | "month" | "lieu";

interface SessionsViewPreferences {
  viewMode: ViewMode;
  groupBy: GroupByMode;
}

const STORAGE_KEY = "sessions-view-preferences";

const defaultPreferences: SessionsViewPreferences = {
  viewMode: "list",
  groupBy: "formation",
};

export function useSessionsViewPreferences() {
  const [preferences, setPreferences] = useState<SessionsViewPreferences>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...defaultPreferences, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.warn("Failed to load sessions view preferences:", e);
    }
    return defaultPreferences;
  });

  // Persist preferences to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch (e) {
      console.warn("Failed to save sessions view preferences:", e);
    }
  }, [preferences]);

  const setViewMode = useCallback((viewMode: ViewMode) => {
    setPreferences((prev) => ({ ...prev, viewMode }));
  }, []);

  const setGroupBy = useCallback((groupBy: GroupByMode) => {
    setPreferences((prev) => ({ ...prev, groupBy }));
  }, []);

  return {
    viewMode: preferences.viewMode,
    groupBy: preferences.groupBy,
    setViewMode,
    setGroupBy,
  };
}
