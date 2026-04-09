/**
 * RM-1: Détection de doublons prospects/contacts à la création
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/useDebounce";

export interface DuplicateMatch {
  id: string;
  nom: string;
  prenom: string;
  email: string | null;
  telephone: string | null;
  formation: string | null;
  match_type: string;
  source: "contact" | "prospect";
}

interface DuplicateCheckParams {
  nom: string;
  prenom: string;
  email?: string;
  telephone?: string;
}

export function useProspectDuplicateCheck(params: DuplicateCheckParams) {
  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([]);
  const [isChecking, setIsChecking] = useState(false);

  const debouncedNom = useDebounce(params.nom, 400);
  const debouncedPrenom = useDebounce(params.prenom, 400);
  const debouncedEmail = useDebounce(params.email || "", 400);
  const debouncedTelephone = useDebounce(params.telephone || "", 400);

  const checkDuplicates = useCallback(async () => {
    if (!debouncedNom || !debouncedPrenom) {
      setDuplicates([]);
      return;
    }
    if (debouncedNom.length < 2 || debouncedPrenom.length < 2) {
      setDuplicates([]);
      return;
    }

    setIsChecking(true);
    try {
      const results: DuplicateMatch[] = [];

      // Check contacts via existing RPC
      const { data: contactDups } = await supabase.rpc("check_duplicate_contacts", {
        p_nom: debouncedNom,
        p_prenom: debouncedPrenom,
        p_email: debouncedEmail || null,
      });

      if (contactDups) {
        for (const d of contactDups as any[]) {
          results.push({
            id: d.id,
            nom: d.nom,
            prenom: d.prenom,
            email: d.email,
            telephone: d.telephone,
            formation: d.formation,
            match_type: d.match_type,
            source: "contact",
          });
        }
      }

      // Check prospects by name/email
      let prospectQuery = supabase
        .from("prospects")
        .select("id, nom, prenom, email, telephone, formation_souhaitee")
        .eq("is_active", true)
        .is("deleted_at", null)
        .limit(5);

      // Email match
      if (debouncedEmail) {
        const { data: emailMatches } = await supabase
          .from("prospects")
          .select("id, nom, prenom, email, telephone, formation_souhaitee")
          .eq("is_active", true)
          .is("deleted_at", null)
          .ilike("email", debouncedEmail)
          .limit(3);

        if (emailMatches) {
          for (const p of emailMatches) {
            if (!results.find(r => r.id === p.id && r.source === "prospect")) {
              results.push({
                id: p.id,
                nom: p.nom,
                prenom: p.prenom,
                email: p.email,
                telephone: p.telephone,
                formation: p.formation_souhaitee,
                match_type: "email",
                source: "prospect",
              });
            }
          }
        }
      }

      // Name match on prospects
      const { data: nameMatches } = await supabase
        .from("prospects")
        .select("id, nom, prenom, email, telephone, formation_souhaitee")
        .eq("is_active", true)
        .is("deleted_at", null)
        .ilike("nom", debouncedNom)
        .ilike("prenom", debouncedPrenom)
        .limit(3);

      if (nameMatches) {
        for (const p of nameMatches) {
          if (!results.find(r => r.id === p.id && r.source === "prospect")) {
            results.push({
              id: p.id,
              nom: p.nom,
              prenom: p.prenom,
              email: p.email,
              telephone: p.telephone,
              formation: p.formation_souhaitee,
              match_type: "nom_prenom",
              source: "prospect",
            });
          }
        }
      }

      setDuplicates(results);
    } catch (err) {
      console.error("Duplicate check error:", err);
      setDuplicates([]);
    } finally {
      setIsChecking(false);
    }
  }, [debouncedNom, debouncedPrenom, debouncedEmail, debouncedTelephone]);

  useEffect(() => {
    checkDuplicates();
  }, [checkDuplicates]);

  return { duplicates, isChecking, hasDuplicates: duplicates.length > 0 };
}
