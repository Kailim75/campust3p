import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface RecentItem {
  id: string;
  type: "contact" | "session" | "facture" | "document";
  name: string;
  subtitle?: string;
  timestamp: number;
}

export interface FavoriteItem {
  id: string;
  type: "contact" | "session";
  name: string;
  subtitle?: string;
  addedAt: number;
}

interface RecentItemsState {
  recentItems: RecentItem[];
  favorites: FavoriteItem[];
  addRecentItem: (item: Omit<RecentItem, "timestamp">) => void;
  clearRecent: () => void;
  addFavorite: (item: Omit<FavoriteItem, "addedAt">) => void;
  removeFavorite: (id: string, type: FavoriteItem["type"]) => void;
  isFavorite: (id: string, type: FavoriteItem["type"]) => boolean;
}

const MAX_RECENT_ITEMS = 15;

export const useRecentItems = create<RecentItemsState>()(
  persist(
    (set, get) => ({
      recentItems: [],
      favorites: [],

      addRecentItem: (item) => {
        set((state) => {
          // Remove duplicate if exists
          const filtered = state.recentItems.filter(
            (r) => !(r.id === item.id && r.type === item.type)
          );
          
          // Add new item at the beginning
          const newRecent: RecentItem = {
            ...item,
            timestamp: Date.now(),
          };
          
          // Keep only MAX_RECENT_ITEMS
          const updated = [newRecent, ...filtered].slice(0, MAX_RECENT_ITEMS);
          
          return { recentItems: updated };
        });
      },

      clearRecent: () => set({ recentItems: [] }),

      addFavorite: (item) => {
        set((state) => {
          // Check if already favorite
          const exists = state.favorites.some(
            (f) => f.id === item.id && f.type === item.type
          );
          if (exists) return state;

          const newFavorite: FavoriteItem = {
            ...item,
            addedAt: Date.now(),
          };

          return { favorites: [...state.favorites, newFavorite] };
        });
      },

      removeFavorite: (id, type) => {
        set((state) => ({
          favorites: state.favorites.filter(
            (f) => !(f.id === id && f.type === type)
          ),
        }));
      },

      isFavorite: (id, type) => {
        return get().favorites.some((f) => f.id === id && f.type === type);
      },
    }),
    {
      name: "crm-recent-items",
    }
  )
);

// Helper hook to track item view
export function useTrackRecentItem() {
  const addRecentItem = useRecentItems((state) => state.addRecentItem);
  
  return {
    trackContact: (id: string, name: string, email?: string) => {
      addRecentItem({
        id,
        type: "contact",
        name,
        subtitle: email,
      });
    },
    trackSession: (id: string, name: string, date?: string) => {
      addRecentItem({
        id,
        type: "session",
        name,
        subtitle: date,
      });
    },
    trackFacture: (id: string, numero: string, contact?: string) => {
      addRecentItem({
        id,
        type: "facture",
        name: numero,
        subtitle: contact,
      });
    },
  };
}
