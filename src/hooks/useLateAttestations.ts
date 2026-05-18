// ═══════════════════════════════════════════════════════════════
// useLateAttestations — Sessions terminées dont l'attestation
// n'a pas encore été générée/envoyée (alert_attestation_late).
// Regroupe par session pour permettre une clôture en lot.
// ═══════════════════════════════════════════════════════════════

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LateAttestationSession {
  sessionId: string;
  sessionNom: string | null;
  dateDebut: string | null;
  dateFin: string | null;
  centreId: string | null;
  apprenants: {
    inscriptionId: string;
    contactId: string;
    attestationGenerated: boolean;
    attestationSent: boolean;
  }[];
  nbApprenants: number;
  nbAGenerer: number;
  nbAEnvoyer: number;
  joursDeRetard: number;
}

export function useLateAttestations(centreId: string | null | undefined) {
  return useQuery({
    queryKey: ["late-attestations", centreId],
    enabled: !!centreId,
    queryFn: async (): Promise<LateAttestationSession[]> => {
      const { data, error } = await (supabase as any)
        .from("v_inscription_workflow")
        .select("*")
        .eq("centre_id", centreId)
        .eq("alert_attestation_late", true);
      if (error) throw error;

      const groups = new Map<string, LateAttestationSession>();
      const now = Date.now();
      for (const r of data ?? []) {
        const existing = groups.get(r.session_id);
        const apprenant = {
          inscriptionId: r.inscription_id,
          contactId: r.contact_id,
          attestationGenerated: !!r.attestation_generated,
          attestationSent: !!r.attestation_sent,
        };
        if (existing) {
          existing.apprenants.push(apprenant);
        } else {
          const fin = r.date_fin ? new Date(r.date_fin).getTime() : now;
          groups.set(r.session_id, {
            sessionId: r.session_id,
            sessionNom: r.session_nom,
            dateDebut: r.date_debut,
            dateFin: r.date_fin,
            centreId: r.centre_id,
            apprenants: [apprenant],
            nbApprenants: 0,
            nbAGenerer: 0,
            nbAEnvoyer: 0,
            joursDeRetard: Math.max(0, Math.floor((now - fin) / 86400000)),
          });
        }
      }
      const list = Array.from(groups.values()).map((g) => ({
        ...g,
        nbApprenants: g.apprenants.length,
        nbAGenerer: g.apprenants.filter((a) => !a.attestationGenerated).length,
        nbAEnvoyer: g.apprenants.filter((a) => a.attestationGenerated && !a.attestationSent).length,
      }));
      list.sort((a, b) => (b.dateFin ?? "").localeCompare(a.dateFin ?? ""));
      return list;
    },
    staleTime: 60_000,
  });
}
