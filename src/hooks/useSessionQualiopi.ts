import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface QualiopiCriterion {
  id: string;
  label: string;
  description: string;
  category: "documents" | "pedagogie" | "administratif" | "qualite";
  required: boolean;
  status: "conforme" | "non_conforme" | "partiel" | "na";
  detail?: string;
}

export interface SessionQualiopiScore {
  score: number; // 0-100
  level: "conforme" | "partiel" | "non_conforme";
  criteria: QualiopiCriterion[];
  conformeCount: number;
  totalApplicable: number;
  alertes: string[];
}

export function useSessionQualiopi(sessionId: string | null) {
  return useQuery({
    queryKey: ["session-qualiopi", sessionId],
    queryFn: async (): Promise<SessionQualiopiScore> => {
      if (!sessionId) throw new Error("No session ID");

      // Fetch all data in parallel
      const [
        sessionRes,
        inscriptionsRes,
        documentsRes,
        certificatsRes,
        satisfactionRes,
        emargementRes,
      ] = await Promise.all([
        supabase.from("sessions").select("*").eq("id", sessionId).single(),
        supabase.from("session_inscriptions").select("id, contact_id").eq("session_id", sessionId),
        supabase.from("document_envois").select("id, document_type, statut").eq("session_id", sessionId),
        supabase.from("attestation_certificates").select("id, status").eq("session_id", sessionId),
        supabase.from("satisfaction_reponses").select("id").eq("session_id", sessionId),
        supabase.from("emargements").select("id").eq("session_id", sessionId),
      ]);

      // Fetch signature requests via inscription IDs
      const inscriptionsData = inscriptionsRes.data || [];
      const inscriptionIds = inscriptionsData.map(i => i.id);
      let signaturesData: { id: string; type_document: string; statut: string }[] = [];
      if (inscriptionIds.length > 0) {
        const sigRes = await supabase
          .from("signature_requests")
          .select("id, type_document, statut")
          .in("session_inscription_id", inscriptionIds);
        signaturesData = (sigRes.data || []) as any[];
      }

      const session = sessionRes.data;
      const inscriptions = inscriptionsData;
      const documents = documentsRes.data || [];
      const signatures = signaturesData;
      const certificats = certificatsRes.data || [];
      const satisfactions = satisfactionRes.data || [];
      const emargements = emargementRes.data || [];
      const nbInscrits = inscriptions.length;

      const criteria: QualiopiCriterion[] = [];
      const alertes: string[] = [];

      // 1. Programme rattaché (objectifs pédagogiques définis)
      const hasObjectifs = !!session?.objectifs && session.objectifs.trim().length > 0;
      criteria.push({
        id: "programme",
        label: "Programme de formation",
        description: "Objectifs pédagogiques définis dans la session",
        category: "pedagogie",
        required: true,
        status: hasObjectifs ? "conforme" : "non_conforme",
        detail: hasObjectifs ? "Objectifs définis" : "Aucun objectif pédagogique renseigné",
      });
      if (!hasObjectifs) alertes.push("Objectifs pédagogiques manquants");

      // 2. Prérequis définis
      const hasPrerequis = !!session?.prerequis && session.prerequis.trim().length > 0;
      criteria.push({
        id: "prerequis",
        label: "Prérequis",
        description: "Prérequis définis pour les stagiaires",
        category: "pedagogie",
        required: false,
        status: hasPrerequis ? "conforme" : "non_conforme",
        detail: hasPrerequis ? "Prérequis définis" : "Aucun prérequis renseigné",
      });

      // 3. Convocations envoyées
      const convocations = documents.filter(d => d.document_type === "convocation");
      const convocStatus = nbInscrits === 0 ? "na" :
        convocations.length >= nbInscrits ? "conforme" :
        convocations.length > 0 ? "partiel" : "non_conforme";
      criteria.push({
        id: "convocations",
        label: "Convocations envoyées",
        description: "Convocations envoyées à tous les stagiaires",
        category: "administratif",
        required: true,
        status: convocStatus,
        detail: `${convocations.length}/${nbInscrits} envoyée(s)`,
      });
      if (convocStatus === "non_conforme" && nbInscrits > 0) alertes.push(`${nbInscrits - convocations.length} convocation(s) non envoyée(s)`);

      // 4. Contrats/Conventions signés
      const contrats = signatures.filter(s => s.type_document === "contrat" || s.type_document === "convention");
      const contratsSigned = contrats.filter(s => s.statut === "signe");
      const contratsStatus = nbInscrits === 0 ? "na" :
        contratsSigned.length >= nbInscrits ? "conforme" :
        contratsSigned.length > 0 ? "partiel" : "non_conforme";
      criteria.push({
        id: "contrats",
        label: "Contrats / Conventions",
        description: "Contrats ou conventions signés par les stagiaires",
        category: "documents",
        required: true,
        status: contratsStatus,
        detail: `${contratsSigned.length}/${nbInscrits} signé(s)`,
      });
      if (contratsStatus !== "conforme" && contratsStatus !== "na") alertes.push("Contrats/conventions non tous signés");

      // 5. Feuille d'émargement
      const hasEmargement = emargements.length > 0;
      criteria.push({
        id: "emargement",
        label: "Feuille d'émargement",
        description: "Feuille d'émargement créée pour la session",
        category: "documents",
        required: true,
        status: hasEmargement ? "conforme" : "non_conforme",
        detail: hasEmargement ? `${emargements.length} feuille(s) créée(s)` : "Aucune feuille d'émargement",
      });
      if (!hasEmargement) alertes.push("Feuille d'émargement manquante");

      // 6. Évaluations de satisfaction
      const hasSatisfaction = satisfactions.length > 0;
      const isTerminee = session?.statut === "terminee";
      const satisfactionStatus = !isTerminee ? "na" :
        satisfactions.length >= nbInscrits ? "conforme" :
        hasSatisfaction ? "partiel" : "non_conforme";
      criteria.push({
        id: "satisfaction",
        label: "Enquêtes de satisfaction",
        description: "Évaluations de satisfaction collectées",
        category: "qualite",
        required: true,
        status: satisfactionStatus,
        detail: isTerminee ? `${satisfactions.length}/${nbInscrits} reçue(s)` : "Applicable après la session",
      });
      if (isTerminee && satisfactionStatus === "non_conforme") alertes.push("Aucune évaluation de satisfaction");

      // 7. Attestations de fin de formation
      const attestationsValid = certificats.filter(c => c.status === "generated");
      const attestationStatus = !isTerminee ? "na" :
        attestationsValid.length >= nbInscrits ? "conforme" :
        attestationsValid.length > 0 ? "partiel" : "non_conforme";
      criteria.push({
        id: "attestations",
        label: "Attestations de formation",
        description: "Attestations émises pour les stagiaires",
        category: "documents",
        required: true,
        status: attestationStatus,
        detail: isTerminee ? `${attestationsValid.length}/${nbInscrits} émise(s)` : "Applicable après la session",
      });
      if (isTerminee && attestationStatus === "non_conforme") alertes.push("Attestations de formation non émises");

      // 8. Formateur assigné
      const hasFormateur = !!session?.formateur_id;
      criteria.push({
        id: "formateur",
        label: "Formateur assigné",
        description: "Un formateur qualifié est assigné à la session",
        category: "administratif",
        required: true,
        status: hasFormateur ? "conforme" : "non_conforme",
        detail: hasFormateur ? "Formateur assigné" : "Aucun formateur assigné",
      });
      if (!hasFormateur) alertes.push("Aucun formateur assigné");

      // 9. Lieu de formation
      const hasLieu = !!(session?.lieu || session?.adresse_rue || session?.adresse_ville);
      criteria.push({
        id: "lieu",
        label: "Lieu de formation",
        description: "Lieu de la formation renseigné",
        category: "administratif",
        required: true,
        status: hasLieu ? "conforme" : "non_conforme",
        detail: hasLieu ? "Lieu renseigné" : "Lieu non renseigné",
      });
      if (!hasLieu) alertes.push("Lieu de formation non renseigné");

      // 10. Durée de formation
      const hasDuree = !!session?.duree_heures && session.duree_heures > 0;
      criteria.push({
        id: "duree",
        label: "Durée de formation",
        description: "Durée en heures renseignée",
        category: "pedagogie",
        required: true,
        status: hasDuree ? "conforme" : "non_conforme",
        detail: hasDuree ? `${session?.duree_heures}h` : "Durée non renseignée",
      });

      // Calculate score
      const applicable = criteria.filter(c => c.status !== "na");
      const conformes = applicable.filter(c => c.status === "conforme");
      const partiels = applicable.filter(c => c.status === "partiel");
      const totalApplicable = applicable.length;
      const score = totalApplicable > 0
        ? Math.round(((conformes.length + partiels.length * 0.5) / totalApplicable) * 100)
        : 100;
      const level = score >= 80 ? "conforme" : score >= 50 ? "partiel" : "non_conforme";

      return {
        score,
        level,
        criteria,
        conformeCount: conformes.length,
        totalApplicable,
        alertes,
      };
    },
    enabled: !!sessionId,
  });
}
