import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SessionConformite {
  id: string;
  nom: string;
  statut: string;
  date_debut: string;
  date_fin: string;
  formation_type: string;
  // Checks
  hasEmargement: boolean;
  hasConvention: boolean;
  hasSatisfaction: boolean;
  hasCertificats: boolean;
  hasProgramme: boolean;
  nbInscrits: number;
  nbProblemes: number;
  problemes: string[];
  actionRecommandee: string;
}

export interface ApprenantConformite {
  id: string;
  nom: string;
  prenom: string;
  formation: string | null;
  hasConvention: boolean;
  hasProgramme: boolean;
  hasTestPositionnement: boolean;
  hasEmargement: boolean;
  hasCertificat: boolean;
  hasSatisfaction: boolean;
  nbProblemes: number;
  conformiteLevel: 'conforme' | 'incomplet' | 'non_conforme';
}

export interface QualiopiAlerte {
  id: string;
  type: 'error' | 'warning' | 'info';
  titre: string;
  description: string;
  action?: string;
  count?: number;
  severity: 'critique' | 'important' | 'amelioration';
  critere?: number;
}

export interface QualiopiCentreData {
  // Sessions stats
  totalSessions: number;
  sessionsTerminees: number;
  sessionsAvecSatisfaction: number;
  sessionsAvecEmargement: number;
  sessionsCompletes: number;

  // Documents stats
  totalCertificats: number;
  totalConventions: number;
  totalContrats: number;
  totalEmargements: number;

  // Satisfaction stats
  totalSatisfactionReponses: number;
  avgSatisfaction: number;
  npsScore: number;
  tauxSatisfaction: number;

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

  // New: sessions conformité detail
  sessionsConformite: SessionConformite[];
  sessionsNonConformes: SessionConformite[];

  // New: apprenants conformité
  apprenantsConformite: ApprenantConformite[];

  // New: top critiques pour mode audit
  topCritiques: QualiopiAlerte[];
}

export function useQualiopiCentreData() {
  return useQuery({
    queryKey: ['qualiopi-centre-data'],
    queryFn: async (): Promise<QualiopiCentreData> => {
      const [
        sessionsRes,
        certificatsRes,
        satisfactionRes,
        emargementsRes,
        conventionsRes,
        enquetesRes,
        inscriptionsRes,
        pedagogicalDocsRes,
        signatureRequestsRes,
      ] = await Promise.all([
        supabase.from('sessions').select('id, statut, date_debut, date_fin, nom, formation_type, catalogue_formation_id').eq('archived', false),
        supabase.from('attestation_certificates').select('id, status, session_id, contact_id'),
        supabase.from('satisfaction_reponses').select('id, session_id, contact_id, note_globale, nps_score'),
        supabase.from('emargements').select('id, session_id').limit(1000),
        supabase.from('document_envois').select('id, session_id, contact_id, document_type, statut')
          .in('document_type', ['convention', 'contrat', 'programme']),
        supabase.from('enquete_tokens').select('id, session_id, type, used_at')
          .eq('type', 'satisfaction'),
        supabase.from('session_inscriptions').select('id, session_id, contact_id, statut')
          .in('statut', ['inscrit', 'confirme', 'present', 'encours', 'valide', 'en_attente', 'document']),
        supabase.from('pedagogical_documents').select('id, contact_id, session_id, document_type, status')
          .eq('status', 'actif'),
        supabase.from('signature_requests').select('id, contact_id, type_document, statut'),
      ]);

      const sessions = sessionsRes.data || [];
      const certificats = certificatsRes.data || [];
      const satisfactions = satisfactionRes.data || [];
      const emargements = emargementsRes.data || [];
      const conventions = conventionsRes.data || [];
      const enquetes = enquetesRes.data || [];
      const inscriptions = inscriptionsRes.data || [];
      const pedagogicalDocs = pedagogicalDocsRes.data || [];
      const signatureRequests = signatureRequestsRes.data || [];

      // Build lookup sets
      const sessionIdsWithSatisfaction = new Set(satisfactions.map(s => s.session_id));
      const sessionIdsWithEmargement = new Set(emargements.map(e => e.session_id));
      const sessionIdsWithConvention = new Set(conventions.filter(c => c.document_type === 'convention' || c.document_type === 'contrat').map(c => c.session_id));
      const sessionIdsWithProgramme = new Set(conventions.filter(c => c.document_type === 'programme').map(c => c.session_id));
      const sessionIdsWithCertificat = new Set(certificats.filter(c => c.status === 'generated').map(c => c.session_id));

      // Contact-level lookups
      const contactIdsWithConvention = new Set(conventions.filter(c => c.document_type === 'convention' || c.document_type === 'contrat').map(c => c.contact_id).filter(Boolean));
      const contactIdsWithSatisfaction = new Set(satisfactions.map(s => s.contact_id).filter(Boolean));
      const contactIdsWithCertificat = new Set(certificats.filter(c => c.status === 'generated').map(c => c.contact_id).filter(Boolean));
      const contactIdsWithTestPositionnement = new Set(pedagogicalDocs.filter(d => d.document_type === 'test_positionnement').map(d => d.contact_id));
      const contactIdsWithEmargement = new Set<string>();
      // Map contact from inscription to session emargement
      inscriptions.forEach(insc => {
        if (sessionIdsWithEmargement.has(insc.session_id)) {
          contactIdsWithEmargement.add(insc.contact_id);
        }
      });
      const contactIdsWithProgramme = new Set(conventions.filter(c => c.document_type === 'programme').map(c => c.contact_id).filter(Boolean));
      // Signed contracts/conventions from signature_requests
      const contactIdsWithSignedContract = new Set(
        signatureRequests
          .filter(sr => sr.statut === 'signe' && (sr.type_document === 'contrat' || sr.type_document === 'convention'))
          .map(sr => sr.contact_id).filter(Boolean)
      );

      // Inscriptions by session
      const inscriptionsBySession = new Map<string, typeof inscriptions>();
      inscriptions.forEach(i => {
        const arr = inscriptionsBySession.get(i.session_id) || [];
        arr.push(i);
        inscriptionsBySession.set(i.session_id, arr);
      });

      const sessionsTerminees = sessions.filter(s => s.statut === 'terminee');
      const totalSessions = sessions.length;
      const totalTerminees = sessionsTerminees.length;

      const sessionsAvecSatisfaction = sessionsTerminees.filter(s => sessionIdsWithSatisfaction.has(s.id)).length;
      const sessionsAvecEmargement = sessions.filter(s => sessionIdsWithEmargement.has(s.id)).length;

      // Sessions conformité detail
      const sessionsConformite: SessionConformite[] = sessions
        .filter(s => s.statut !== 'annulee')
        .map(s => {
          const hasEmargement = sessionIdsWithEmargement.has(s.id);
          const hasConvention = sessionIdsWithConvention.has(s.id);
          const hasSatisfaction = sessionIdsWithSatisfaction.has(s.id);
          const hasCertificats = sessionIdsWithCertificat.has(s.id);
          const hasProgramme = sessionIdsWithProgramme.has(s.id) || !!s.catalogue_formation_id;
          const nbInscrits = inscriptionsBySession.get(s.id)?.length || 0;

          const problemes: string[] = [];
          if (!hasProgramme) problemes.push('Programme non attaché');
          if (!hasEmargement && s.statut !== 'a_venir') problemes.push('Émargement manquant');
          if (!hasConvention && nbInscrits > 0) problemes.push('Convention/Contrat absent');
          if (s.statut === 'terminee' && !hasSatisfaction) problemes.push('Satisfaction non collectée');
          if (s.statut === 'terminee' && !hasCertificats && nbInscrits > 0) problemes.push('Attestations non générées');

          let actionRecommandee = '';
          if (problemes.length > 0) {
            if (problemes.some(p => p.includes('Programme'))) actionRecommandee = 'Associer un programme de formation';
            else if (problemes.some(p => p.includes('Émargement'))) actionRecommandee = 'Générer la feuille d\'émargement';
            else if (problemes.some(p => p.includes('Convention'))) actionRecommandee = 'Envoyer la convention/contrat';
            else if (problemes.some(p => p.includes('Satisfaction'))) actionRecommandee = 'Envoyer l\'enquête de satisfaction';
            else if (problemes.some(p => p.includes('Attestation'))) actionRecommandee = 'Générer les attestations';
          }

          return {
            id: s.id,
            nom: s.nom,
            statut: s.statut,
            date_debut: s.date_debut,
            date_fin: s.date_fin,
            formation_type: s.formation_type,
            hasEmargement,
            hasConvention,
            hasSatisfaction,
            hasCertificats,
            hasProgramme,
            nbInscrits,
            nbProblemes: problemes.length,
            problemes,
            actionRecommandee,
          };
        });

      const sessionsNonConformes = sessionsConformite
        .filter(s => s.nbProblemes > 0)
        .sort((a, b) => b.nbProblemes - a.nbProblemes);

      const sessionsCompletes = sessionsConformite.filter(s => s.nbProblemes === 0).length;

      // Apprenants conformité - unique contacts from inscriptions
      const uniqueContactIds = [...new Set(inscriptions.map(i => i.contact_id))];
      const apprenantsConformite: ApprenantConformite[] = uniqueContactIds.slice(0, 200).map(contactId => {
        const hasConvention = contactIdsWithConvention.has(contactId) || contactIdsWithSignedContract.has(contactId);
        const hasProgramme = contactIdsWithProgramme.has(contactId);
        const hasTestPositionnement = contactIdsWithTestPositionnement.has(contactId);
        const hasEmargement = contactIdsWithEmargement.has(contactId);
        const hasCertificat = contactIdsWithCertificat.has(contactId);
        const hasSatisfaction = contactIdsWithSatisfaction.has(contactId);

        const checks = [hasConvention, hasProgramme, hasEmargement];
        const nbOk = checks.filter(Boolean).length;
        const nbProblemes = checks.length - nbOk;

        const conformiteLevel: ApprenantConformite['conformiteLevel'] =
          nbProblemes === 0 ? 'conforme' : nbProblemes <= 1 ? 'incomplet' : 'non_conforme';

        return {
          id: contactId,
          nom: '',
          prenom: '',
          formation: null,
          hasConvention,
          hasProgramme,
          hasTestPositionnement,
          hasEmargement,
          hasCertificat,
          hasSatisfaction,
          nbProblemes,
          conformiteLevel,
        };
      });

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

      // Score conformité dynamique
      const pctDocsObligatoires = totalSessions > 0
        ? Math.round(((sessionsAvecEmargement + conventions.filter(c => c.document_type !== 'programme').length) / (totalSessions * 2)) * 100)
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

      // Alertes automatiques priorisées
      const alertes: QualiopiAlerte[] = [];

      // CRITIQUE: Sessions terminées sans satisfaction
      const sessionsTermineesSansSatisfaction = sessionsTerminees.filter(s => !sessionIdsWithSatisfaction.has(s.id));
      if (sessionsTermineesSansSatisfaction.length > 0) {
        alertes.push({
          id: 'no-satisfaction', type: 'error', severity: 'critique', critere: 7,
          titre: 'Sessions terminées sans satisfaction',
          description: `${sessionsTermineesSansSatisfaction.length} session(s) — Bloque Critère 7`,
          count: sessionsTermineesSansSatisfaction.length,
        });
      }

      // CRITIQUE: Sessions sans émargement
      const sessionsSansEmargement = sessions.filter(s =>
        !sessionIdsWithEmargement.has(s.id) && s.statut !== 'a_venir' && s.statut !== 'annulee'
      );
      if (sessionsSansEmargement.length > 0) {
        alertes.push({
          id: 'no-emargement', type: 'error', severity: 'critique', critere: 4,
          titre: 'Sessions sans émargement',
          description: `${sessionsSansEmargement.length} session(s) active(s) — Document obligatoire audit`,
          count: sessionsSansEmargement.length,
        });
      }

      // CRITIQUE: Taux satisfaction < 80%
      if (avgSatisfaction > 0 && avgSatisfaction < 4) {
        alertes.push({
          id: 'low-satisfaction', type: 'error', severity: 'critique', critere: 7,
          titre: 'Satisfaction insuffisante',
          description: `Moyenne ${avgSatisfaction}/5 — Objectif : ≥4/5. Impact direct sur certification`,
        });
      }

      // IMPORTANT: Enquêtes à froid
      const enquetesNonEnvoyees = totalTerminees - enquetesUsed;
      if (enquetesNonEnvoyees > 0 && totalTerminees > 0) {
        alertes.push({
          id: 'no-cold-survey', type: 'warning', severity: 'important', critere: 7,
          titre: 'Enquêtes à froid non réalisées',
          description: `${enquetesNonEnvoyees} session(s) — Indicateur 32 non conforme`,
          count: enquetesNonEnvoyees,
        });
      }

      // IMPORTANT: Dossiers incomplets
      const dossiersIncomplets = sessionsNonConformes.length;
      if (dossiersIncomplets > 0 && totalSessions > 0) {
        alertes.push({
          id: 'incomplete-dossiers', type: 'warning', severity: 'important',
          titre: 'Sessions avec dossier incomplet',
          description: `${dossiersIncomplets} session(s) — Documents ou preuves manquants`,
          count: dossiersIncomplets,
        });
      }

      // AMÉLIORATION: Sessions sans programme
      const sessionsSansProgramme = sessionsConformite.filter(s => !s.hasProgramme);
      if (sessionsSansProgramme.length > 0) {
        alertes.push({
          id: 'no-programme', type: 'warning', severity: 'amelioration', critere: 1,
          titre: 'Programmes de formation non associés',
          description: `${sessionsSansProgramme.length} session(s) sans programme — Critère 1`,
          count: sessionsSansProgramme.length,
        });
      }

      // AMÉLIORATION: Attestations non générées
      const sessionsTermSansCertif = sessionsTerminees.filter(s => !sessionIdsWithCertificat.has(s.id));
      if (sessionsTermSansCertif.length > 0) {
        alertes.push({
          id: 'no-certificats', type: 'warning', severity: 'amelioration',
          titre: 'Attestations non générées',
          description: `${sessionsTermSansCertif.length} session(s) terminée(s) sans attestation`,
          count: sessionsTermSansCertif.length,
        });
      }

      // Sort alertes: critique first, then important, then amelioration
      const severityOrder = { critique: 0, important: 1, amelioration: 2 };
      alertes.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

      // Top critiques pour mode audit
      const topCritiques = alertes.filter(a => a.severity === 'critique').slice(0, 5);

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
        sessionsConformite,
        sessionsNonConformes,
        apprenantsConformite,
        topCritiques,
      };
    },
    staleTime: 2 * 60 * 1000, // Refresh more often for dynamic data
  });
}
