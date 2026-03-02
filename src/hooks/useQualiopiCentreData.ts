import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface QualiopiCentreData {
  // Sessions stats
  totalSessions: number;
  sessionsTerminees: number;
  sessionsAvecSatisfaction: number;
  sessionsAvecEmargement: number;
  sessionsCompletes: number; // sessions with all docs

  // Documents stats
  totalCertificats: number;
  totalConventions: number;
  totalContrats: number;
  totalEmargements: number;

  // Satisfaction stats
  totalSatisfactionReponses: number;
  avgSatisfaction: number;
  npsScore: number;
  tauxSatisfaction: number; // % sessions with satisfaction

  // Enquêtes à froid
  totalEnquetesFroid: number;
  tauxEnquetesFroid: number;

  // Alertes
  alertes: QualiopiAlerte[];

  // Score enrichi
  scoreConformite: number;
  scoreLevel: 'ready' | 'warning' | 'critical';
  isQualiopiReady: boolean;

  // Détails scoring
  pctDocsObligatoires: number;
  pctSessionsSatisfaction: number;
  pctDossiersComplets: number;
  pctEnquetesFroid: number;
}

export interface QualiopiAlerte {
  id: string;
  type: 'error' | 'warning' | 'info';
  titre: string;
  description: string;
  action?: string;
  count?: number;
}

export function useQualiopiCentreData() {
  return useQuery({
    queryKey: ['qualiopi-centre-data'],
    queryFn: async (): Promise<QualiopiCentreData> => {
      // Fetch all data in parallel
      const [
        sessionsRes,
        certificatsRes,
        satisfactionRes,
        emargementsRes,
        conventionsRes,
        enquetesRes,
      ] = await Promise.all([
        supabase.from('sessions').select('id, statut, date_fin, nom').eq('archived', false),
        supabase.from('attestation_certificates').select('id, status, session_id'),
        supabase.from('satisfaction_reponses').select('id, session_id, note_globale, nps_score'),
        supabase.from('emargements').select('id, session_id').limit(1000),
        supabase.from('document_envois').select('id, session_id, document_type, statut')
          .in('document_type', ['convention', 'contrat']),
        supabase.from('enquete_tokens').select('id, session_id, type, used_at')
          .eq('type', 'satisfaction'),
      ]);

      const sessions = sessionsRes.data || [];
      const certificats = certificatsRes.data || [];
      const satisfactions = satisfactionRes.data || [];
      const emargements = emargementsRes.data || [];
      const conventions = conventionsRes.data || [];
      const enquetes = enquetesRes.data || [];

      const sessionsTerminees = sessions.filter(s => s.statut === 'terminee');
      const totalSessions = sessions.length;
      const totalTerminees = sessionsTerminees.length;

      // Sessions with satisfaction
      const sessionIdsWithSatisfaction = new Set(satisfactions.map(s => s.session_id));
      const sessionsAvecSatisfaction = sessionsTerminees.filter(s => sessionIdsWithSatisfaction.has(s.id)).length;

      // Sessions with emargement
      const sessionIdsWithEmargement = new Set(emargements.map(e => e.session_id));
      const sessionsAvecEmargement = sessions.filter(s => sessionIdsWithEmargement.has(s.id)).length;

      // Sessions complètes (has emargement + convention/contrat + satisfaction if terminée)
      const sessionIdsWithConvention = new Set(conventions.map(c => c.session_id));
      const sessionsCompletes = sessions.filter(s => {
        const hasEmarg = sessionIdsWithEmargement.has(s.id);
        const hasConv = sessionIdsWithConvention.has(s.id);
        if (s.statut === 'terminee') {
          return hasEmarg && hasConv && sessionIdsWithSatisfaction.has(s.id);
        }
        return hasEmarg && hasConv;
      }).length;

      // Satisfaction stats
      const notes = satisfactions.filter(s => s.note_globale != null).map(s => s.note_globale as number);
      const avgSatisfaction = notes.length > 0 ? Math.round((notes.reduce((a, b) => a + b, 0) / notes.length) * 10) / 10 : 0;
      const npsScores = satisfactions.filter(s => s.nps_score != null).map(s => s.nps_score as number);
      const promoters = npsScores.filter(s => s >= 9).length;
      const detractors = npsScores.filter(s => s <= 6).length;
      const npsScore = npsScores.length > 0 ? Math.round(((promoters - detractors) / npsScores.length) * 100) : 0;

      const tauxSatisfaction = totalTerminees > 0 ? Math.round((sessionsAvecSatisfaction / totalTerminees) * 100) : 100;

      // Enquêtes à froid
      const enquetesUsed = enquetes.filter(e => e.used_at != null).length;
      const tauxEnquetesFroid = totalTerminees > 0 ? Math.round((enquetesUsed / totalTerminees) * 100) : 0;

      // Score conformité enrichi
      const pctDocsObligatoires = totalSessions > 0
        ? Math.round(((sessionsAvecEmargement + conventions.length) / (totalSessions * 2)) * 100)
        : 100;
      const pctSessionsSatisfaction = tauxSatisfaction;
      const pctDossiersComplets = totalSessions > 0
        ? Math.round((sessionsCompletes / totalSessions) * 100)
        : 100;
      const pctEnquetesFroid = tauxEnquetesFroid;

      const scoreConformite = Math.round(
        pctDocsObligatoires * 0.3 +
        pctSessionsSatisfaction * 0.3 +
        pctDossiersComplets * 0.25 +
        pctEnquetesFroid * 0.15
      );

      const scoreLevel: QualiopiCentreData['scoreLevel'] = scoreConformite > 80 ? 'ready' : scoreConformite >= 50 ? 'warning' : 'critical';
      const isQualiopiReady = scoreConformite > 80;

      // Alertes automatiques
      const alertes: QualiopiAlerte[] = [];

      // Sessions terminées sans satisfaction
      const sessionsTermineesSansSatisfaction = sessionsTerminees.filter(s => !sessionIdsWithSatisfaction.has(s.id));
      if (sessionsTermineesSansSatisfaction.length > 0) {
        alertes.push({
          id: 'no-satisfaction',
          type: 'error',
          titre: 'Enquêtes de satisfaction manquantes',
          description: `${sessionsTermineesSansSatisfaction.length} session(s) terminée(s) sans enquête de satisfaction`,
          count: sessionsTermineesSansSatisfaction.length,
        });
      }

      // Taux satisfaction < 80%
      if (avgSatisfaction > 0 && avgSatisfaction < 4) {
        alertes.push({
          id: 'low-satisfaction',
          type: 'warning',
          titre: 'Taux de satisfaction faible',
          description: `Note moyenne de satisfaction : ${avgSatisfaction}/5 (objectif : ≥4/5)`,
        });
      }

      // Sessions sans émargement
      const sessionsSansEmargement = sessions.filter(s =>
        !sessionIdsWithEmargement.has(s.id) && s.statut !== 'a_venir' && s.statut !== 'annulee'
      );
      if (sessionsSansEmargement.length > 0) {
        alertes.push({
          id: 'no-emargement',
          type: 'error',
          titre: 'Sessions sans émargement',
          description: `${sessionsSansEmargement.length} session(s) active(s) sans feuille d'émargement`,
          count: sessionsSansEmargement.length,
        });
      }

      // Dossiers incomplets
      const dossiersIncomplets = totalSessions - sessionsCompletes;
      if (dossiersIncomplets > 0 && totalSessions > 0) {
        alertes.push({
          id: 'incomplete-dossiers',
          type: 'warning',
          titre: 'Dossiers incomplets',
          description: `${dossiersIncomplets} session(s) avec des documents manquants`,
          count: dossiersIncomplets,
        });
      }

      // Enquêtes à froid non envoyées
      const enquetesNonEnvoyees = totalTerminees - enquetesUsed;
      if (enquetesNonEnvoyees > 0 && totalTerminees > 0) {
        alertes.push({
          id: 'no-cold-survey',
          type: 'warning',
          titre: 'Enquêtes à froid non réalisées',
          description: `${enquetesNonEnvoyees} session(s) terminée(s) sans enquête à froid`,
          count: enquetesNonEnvoyees,
        });
      }

      return {
        totalSessions,
        sessionsTerminees: totalTerminees,
        sessionsAvecSatisfaction,
        sessionsAvecEmargement,
        sessionsCompletes,
        totalCertificats: certificats.filter(c => c.status === 'generated').length,
        totalConventions: conventions.filter(c => c.document_type === 'convention').length,
        totalContrats: conventions.filter(c => c.document_type === 'contrat').length,
        totalEmargements: emargements.length,
        totalSatisfactionReponses: satisfactions.length,
        avgSatisfaction,
        npsScore,
        tauxSatisfaction,
        totalEnquetesFroid: enquetesUsed,
        tauxEnquetesFroid,
        alertes,
        scoreConformite,
        scoreLevel,
        isQualiopiReady,
        pctDocsObligatoires,
        pctSessionsSatisfaction,
        pctDossiersComplets,
        pctEnquetesFroid,
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}
