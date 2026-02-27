import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface DuplicateContact {
  id: string;
  nom: string;
  prenom: string;
  email: string | null;
  date_naissance: string | null;
  telephone: string | null;
  formation: string | null;
  match_type: string;
}

export function useDuplicateCheck() {
  const [duplicates, setDuplicates] = useState<DuplicateContact[]>([]);
  const [isChecking, setIsChecking] = useState(false);

  const checkDuplicates = useCallback(async (
    nom: string,
    prenom: string,
    email?: string,
    dateNaissance?: string,
    excludeId?: string,
  ) => {
    if (!nom || !prenom || nom.length < 2 || prenom.length < 2) {
      setDuplicates([]);
      return;
    }

    setIsChecking(true);
    try {
      const { data, error } = await supabase.rpc("check_duplicate_contacts", {
        p_nom: nom,
        p_prenom: prenom,
        p_email: email || null,
        p_date_naissance: dateNaissance || null,
        p_exclude_id: excludeId || null,
      });

      if (error) {
        console.error("Duplicate check error:", error);
        setDuplicates([]);
        return;
      }

      setDuplicates((data || []) as DuplicateContact[]);
    } catch {
      setDuplicates([]);
    } finally {
      setIsChecking(false);
    }
  }, []);

  const clearDuplicates = useCallback(() => setDuplicates([]), []);

  return { duplicates, isChecking, checkDuplicates, clearDuplicates };
}
