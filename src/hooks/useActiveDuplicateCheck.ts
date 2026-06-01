import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Pré-vérification stricte d'un doublon actif sur (centre_id, email normalisé).
 * S'appuie sur la RPC SECURITY DEFINER `check_active_duplicate_email`.
 *
 * Périmètre :
 *  - Email normalisé (lower + trim)
 *  - Même centre que celui du contact
 *  - Filtre `deleted_at IS NULL` ET `archived = false`
 *  - Exclut l'id du contact en cours d'édition
 */
export interface ActiveDuplicateMatch {
  id: string;
  nom: string | null;
  prenom: string | null;
}

export function useActiveDuplicateCheck() {
  const [match, setMatch] = useState<ActiveDuplicateMatch | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const check = useCallback(
    async (email: string | null | undefined, centreId: string | null | undefined, excludeId?: string | null) => {
      const e = (email ?? "").trim();
      if (!e || !centreId) {
        setMatch(null);
        return null;
      }
      setIsChecking(true);
      try {
        const { data, error } = await supabase.rpc("check_active_duplicate_email", {
          p_email: e,
          p_centre_id: centreId,
          p_exclude_id: excludeId ?? null,
        });
        if (error) {
          console.error("[useActiveDuplicateCheck] error:", error);
          setMatch(null);
          return null;
        }
        const row = Array.isArray(data) ? data[0] : data;
        if (row && row.has_duplicate && row.existing_contact_id) {
          const m: ActiveDuplicateMatch = {
            id: row.existing_contact_id as string,
            nom: (row.existing_contact_nom as string) ?? null,
            prenom: (row.existing_contact_prenom as string) ?? null,
          };
          setMatch(m);
          return m;
        }
        setMatch(null);
        return null;
      } finally {
        setIsChecking(false);
      }
    },
    [],
  );

  const checkDebounced = useCallback(
    (email: string | null | undefined, centreId: string | null | undefined, excludeId?: string | null, delay = 400) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        void check(email, centreId, excludeId);
      }, delay);
    },
    [check],
  );

  const clear = useCallback(() => setMatch(null), []);

  return { match, isChecking, check, checkDebounced, clear };
}
