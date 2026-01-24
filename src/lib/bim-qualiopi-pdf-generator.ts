import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { BimProjet } from '@/hooks/useBimProjets';
import { BimScene } from '@/hooks/useBimScenes';

// Types for progression and evaluation data
interface BimProgressionData {
  id: string;
  contact_id: string;
  projet_id: string;
  statut: string;
  scenes_completees: number;
  scenes_total: number;
  progression_pct: number;
  score_moyen_pct: number | null;
  meilleur_score_pct: number | null;
  temps_total_sec: number | null;
  started_at: string | null;
  completed_at: string | null;
  validated_at: string | null;
  contact?: {
    nom: string;
    prenom: string;
    email?: string;
    formation?: string;
  };
}

interface BimEvaluationData {
  id: string;
  contact_id: string;
  projet_id: string;
  scene_id: string | null;
  type_evaluation?: string;
  score_pct: number | null;
  reussi: boolean;
  tentative_num?: number;
  reponses_detail?: unknown;
  evaluated_at?: string;
  created_at?: string;
  contact?: {
    nom: string;
    prenom: string;
  };
  scene?: {
    titre: string;
  };
}

interface BimInteractionData {
  id: string;
  contact_id: string;
  projet_id: string;
  scene_id: string;
  started_at: string;
  ended_at?: string | null;
  completed_at?: string | null;
  temps_passe_sec: number | null;
  contact?: {
    nom: string;
    prenom: string;
  };
  scene?: {
    titre: string;
  };
}

interface CentreFormation {
  nom?: string;
  numero_declaration?: string;
  numero_qualiopi?: string;
  adresse?: string;
  code_postal?: string;
  ville?: string;
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

const addHeader = (doc: jsPDF, title: string, subtitle: string, centre?: CentreFormation) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = margin;

  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(37, 99, 235);
  doc.text(title, margin, y);
  y += 7;

  // Subtitle
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(107, 114, 128);
  doc.text(subtitle, margin, y);
  y += 6;

  // Centre info
  if (centre?.nom) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(centre.nom, margin, y);
    y += 5;

    if (centre.numero_declaration) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(107, 114, 128);
      doc.text(`N° déclaration: ${centre.numero_declaration}`, margin, y);
      y += 4;
    }
    if (centre.numero_qualiopi) {
      doc.text(`N° Qualiopi: ${centre.numero_qualiopi}`, margin, y);
      y += 4;
    }
  }

  // Date
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  doc.text(`Généré le ${format(new Date(), "dd MMMM yyyy 'à' HH:mm", { locale: fr })}`, margin, y);
  y += 6;

  // Separator
  doc.setDrawColor(229, 231, 235);
  doc.line(margin, y, pageWidth - margin, y);

  return y + 8;
};

const addFooter = (doc: jsPDF, documentType: string) => {
  const totalPages = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text(`Page ${i}/${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
    doc.text(`${documentType} - Preuve Qualiopi BIM`, margin, pageHeight - 10);
  }
};

const formatDuration = (seconds: number | null): string => {
  if (!seconds) return '-';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  }
  return `${minutes} min`;
};

const getStatutLabel = (statut: string): string => {
  const labels: Record<string, string> = {
    non_commence: 'Non commencé',
    en_cours: 'En cours',
    evalue: 'Évalué',
    valide: 'Validé',
    a_reprendre: 'À reprendre',
  };
  return labels[statut] || statut;
};

const getStatutColor = (statut: string): [number, number, number] => {
  switch (statut) {
    case 'valide':
      return [34, 197, 94];
    case 'en_cours':
    case 'evalue':
      return [59, 130, 246];
    case 'a_reprendre':
      return [249, 115, 22];
    default:
      return [107, 114, 128];
  }
};

// ============================================================
// 1. ATTESTATION DE COMPÉTENCES BIM
// ============================================================

interface AttestationBimOptions {
  projet: BimProjet;
  progression: BimProgressionData;
  evaluations: BimEvaluationData[];
  centre?: CentreFormation;
  numeroCertificat?: string;
}

export function generateAttestationBimPDF({
  projet,
  progression,
  evaluations,
  centre,
  numeroCertificat,
}: AttestationBimOptions): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;

  let y = addHeader(doc, 'ATTESTATION DE COMPÉTENCES', 'Module BIM Pédagogique T3P', centre);

  // Certificate number
  if (numeroCertificat) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(37, 99, 235);
    doc.text(`N° ${numeroCertificat}`, pageWidth - margin, y - 2, { align: 'right' });
  }

  y += 5;

  // Learner info
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('APPRENANT', margin, y);
  y += 6;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const learnerName = progression.contact
    ? `${progression.contact.prenom} ${progression.contact.nom}`
    : 'Apprenant';
  doc.text(learnerName, margin, y);
  y += 5;

  if (progression.contact?.formation) {
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    doc.text(`Formation: ${progression.contact.formation.toUpperCase()}`, margin, y);
    y += 10;
  } else {
    y += 5;
  }

  // Project info
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('PROJET BIM PÉDAGOGIQUE', margin, y);
  y += 6;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`${projet.titre} (${projet.code})`, margin, y);
  y += 5;

  if (projet.description) {
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    const descLines = doc.splitTextToSize(projet.description, pageWidth - margin * 2);
    doc.text(descLines.slice(0, 2), margin, y);
    y += descLines.slice(0, 2).length * 4 + 5;
  }

  // Competencies
  if (projet.competences_cibles?.length > 0) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('COMPÉTENCES ÉVALUÉES', margin, y);
    y += 6;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    projet.competences_cibles.forEach((comp) => {
      doc.setTextColor(34, 197, 94);
      doc.text('✓', margin, y);
      doc.setTextColor(0, 0, 0);
      doc.text(comp, margin + 6, y);
      y += 5;
    });
    y += 5;
  }

  // Results
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('RÉSULTATS', margin, y);
  y += 8;

  // Score box
  const boxWidth = 60;
  const boxHeight = 25;
  const score = progression.meilleur_score_pct ?? progression.score_moyen_pct ?? 0;
  const isValidated = progression.statut === 'valide';

  doc.setFillColor(isValidated ? 240 : 254, isValidated ? 253 : 242, isValidated ? 244 : 233);
  doc.roundedRect(margin, y, boxWidth, boxHeight, 3, 3, 'F');

  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...(isValidated ? [34, 197, 94] : [249, 115, 22]) as [number, number, number]);
  doc.text(`${score}%`, margin + boxWidth / 2, y + 15, { align: 'center' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(isValidated ? 'VALIDÉ' : 'NON VALIDÉ', margin + boxWidth / 2, y + 22, { align: 'center' });

  // Stats next to score
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  const statsX = margin + boxWidth + 15;
  doc.text(`Scènes complétées: ${progression.scenes_completees}/${progression.scenes_total}`, statsX, y + 8);
  doc.text(`Temps total: ${formatDuration(progression.temps_total_sec)}`, statsX, y + 14);
  doc.text(`Tentatives: ${evaluations.length}`, statsX, y + 20);

  y += boxHeight + 10;

  // Validation statement
  if (isValidated && progression.validated_at) {
    doc.setFillColor(240, 253, 244);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 20, 3, 3, 'F');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(34, 197, 94);
    doc.text(
      `Le présent certificat atteste que l'apprenant a validé l'ensemble des compétences`,
      margin + 5,
      y + 8
    );
    doc.text(
      `requises le ${format(new Date(progression.validated_at), 'dd MMMM yyyy', { locale: fr })}.`,
      margin + 5,
      y + 14
    );
    y += 25;
  }

  // Signature block
  y += 10;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text('Fait à ________________________________, le ________________________________', margin, y);
  y += 15;
  doc.text('Signature et cachet du centre de formation:', margin, y);
  y += 25;
  doc.setDrawColor(200, 200, 200);
  doc.rect(margin, y, 60, 25);

  addFooter(doc, 'Attestation de compétences BIM');

  const fileName = `attestation-bim-${projet.code}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  doc.save(fileName);
}

// ============================================================
// 2. FEUILLE DE PRÉSENCE BIM
// ============================================================

interface FeuillePresenceBimOptions {
  projet: BimProjet;
  scenes: BimScene[];
  interactions: BimInteractionData[];
  dateDebut: Date;
  dateFin: Date;
  centre?: CentreFormation;
}

export function generateFeuillePresenceBimPDF({
  projet,
  scenes,
  interactions,
  dateDebut,
  dateFin,
  centre,
}: FeuillePresenceBimOptions): void {
  const doc = new jsPDF({ orientation: 'landscape' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;

  let y = addHeader(doc, 'FEUILLE DE PRÉSENCE', `Projet BIM: ${projet.titre}`, centre);

  // Period
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(
    `Période: du ${format(dateDebut, 'dd/MM/yyyy', { locale: fr })} au ${format(dateFin, 'dd/MM/yyyy', { locale: fr })}`,
    margin,
    y
  );
  y += 10;

  // Table header
  const colWidths = [50, 40, 50, 35, 35, 40, 25];
  const headers = ['Apprenant', 'Date', 'Scène', 'Début', 'Fin', 'Durée', 'Signature'];

  doc.setFillColor(243, 244, 246);
  doc.rect(margin, y, pageWidth - margin * 2, 8, 'F');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);

  let xPos = margin + 2;
  headers.forEach((header, i) => {
    doc.text(header, xPos, y + 5.5);
    xPos += colWidths[i];
  });
  y += 10;

  // Table rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  const sortedInteractions = [...interactions].sort(
    (a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime()
  );

  sortedInteractions.forEach((interaction, index) => {
    if (y > pageHeight - 30) {
      doc.addPage();
      y = 20;
    }

    // Alternating background
    if (index % 2 === 0) {
      doc.setFillColor(249, 250, 251);
      doc.rect(margin, y - 1, pageWidth - margin * 2, 7, 'F');
    }

    xPos = margin + 2;
    const scene = scenes.find((s) => s.id === interaction.scene_id);

    // Apprenant
    const name = interaction.contact
      ? `${interaction.contact.prenom} ${interaction.contact.nom}`
      : '-';
    doc.text(name.substring(0, 20), xPos, y + 4);
    xPos += colWidths[0];

    // Date
    doc.text(format(new Date(interaction.started_at), 'dd/MM/yyyy', { locale: fr }), xPos, y + 4);
    xPos += colWidths[1];

    // Scène
    const sceneTitle = scene?.titre || interaction.scene?.titre || '-';
    doc.text(sceneTitle.substring(0, 22), xPos, y + 4);
    xPos += colWidths[2];

    // Début
    doc.text(format(new Date(interaction.started_at), 'HH:mm', { locale: fr }), xPos, y + 4);
    xPos += colWidths[3];

    // Fin
    if (interaction.ended_at) {
      doc.text(format(new Date(interaction.ended_at), 'HH:mm', { locale: fr }), xPos, y + 4);
    } else {
      doc.text('-', xPos, y + 4);
    }
    xPos += colWidths[4];

    // Durée
    doc.text(formatDuration(interaction.temps_passe_sec), xPos, y + 4);
    xPos += colWidths[5];

    // Signature cell (empty)
    doc.setDrawColor(200, 200, 200);
    doc.rect(xPos, y, colWidths[6] - 5, 6);

    y += 7;
  });

  // Summary
  y += 10;
  if (y > pageHeight - 40) {
    doc.addPage();
    y = 20;
  }

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('RÉCAPITULATIF', margin, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  const uniqueLearners = new Set(interactions.map((i) => i.contact_id)).size;
  const totalTime = interactions.reduce((acc, i) => acc + (i.temps_passe_sec || 0), 0);

  doc.text(`Nombre d'apprenants: ${uniqueLearners}`, margin, y);
  y += 5;
  doc.text(`Nombre de sessions: ${interactions.length}`, margin, y);
  y += 5;
  doc.text(`Temps total: ${formatDuration(totalTime)}`, margin, y);

  addFooter(doc, 'Feuille de présence BIM');

  const fileName = `presence-bim-${projet.code}-${format(dateDebut, 'yyyyMMdd')}-${format(dateFin, 'yyyyMMdd')}.pdf`;
  doc.save(fileName);
}

// ============================================================
// 3. BILAN DE COMPÉTENCES BIM (Synthèse projet)
// ============================================================

interface BilanCompetencesBimOptions {
  projet: BimProjet;
  scenes: BimScene[];
  progressions: BimProgressionData[];
  evaluations: BimEvaluationData[];
  centre?: CentreFormation;
}

export function generateBilanCompetencesBimPDF({
  projet,
  scenes,
  progressions,
  evaluations,
  centre,
}: BilanCompetencesBimOptions): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;

  let y = addHeader(doc, 'BILAN DE COMPÉTENCES BIM', `Projet: ${projet.titre}`, centre);

  // Project summary
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('SYNTHÈSE DU PROJET', margin, y);
  y += 8;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  const stats = {
    total: progressions.length,
    valides: progressions.filter((p) => p.statut === 'valide').length,
    enCours: progressions.filter((p) => p.statut === 'en_cours').length,
    aReprendre: progressions.filter((p) => p.statut === 'a_reprendre').length,
    nonCommences: progressions.filter((p) => p.statut === 'non_commence').length,
  };

  const tauxReussite = stats.total > 0 ? Math.round((stats.valides / stats.total) * 100) : 0;
  const scoreMoyen =
    progressions.length > 0
      ? Math.round(
          progressions.reduce((acc, p) => acc + (p.score_moyen_pct || 0), 0) / progressions.length
        )
      : 0;

  // Stats cards
  const cardWidth = (pageWidth - margin * 2 - 15) / 4;
  const cardHeight = 25;

  const cards = [
    { label: 'Apprenants', value: stats.total.toString(), color: [59, 130, 246] },
    { label: 'Taux réussite', value: `${tauxReussite}%`, color: tauxReussite >= 70 ? [34, 197, 94] : [249, 115, 22] },
    { label: 'Score moyen', value: `${scoreMoyen}%`, color: scoreMoyen >= 70 ? [34, 197, 94] : [249, 115, 22] },
    { label: 'Scènes', value: scenes.length.toString(), color: [107, 114, 128] },
  ];

  cards.forEach((card, i) => {
    const x = margin + i * (cardWidth + 5);
    doc.setFillColor(249, 250, 251);
    doc.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'F');

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...(card.color as [number, number, number]));
    doc.text(card.value, x + cardWidth / 2, y + 12, { align: 'center' });

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128);
    doc.text(card.label, x + cardWidth / 2, y + 20, { align: 'center' });
  });

  y += cardHeight + 15;

  // Status breakdown
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('RÉPARTITION PAR STATUT', margin, y);
  y += 8;

  const statuses = [
    { label: 'Validés', count: stats.valides, color: [34, 197, 94] },
    { label: 'En cours', count: stats.enCours, color: [59, 130, 246] },
    { label: 'À reprendre', count: stats.aReprendre, color: [249, 115, 22] },
    { label: 'Non commencés', count: stats.nonCommences, color: [156, 163, 175] },
  ];

  statuses.forEach((status) => {
    doc.setFontSize(9);
    doc.setTextColor(...(status.color as [number, number, number]));
    doc.text('●', margin, y);
    doc.setTextColor(0, 0, 0);
    doc.text(`${status.label}: ${status.count}`, margin + 5, y);
    y += 5;
  });

  y += 10;

  // Competencies analysis
  if (projet.competences_cibles?.length > 0) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('COMPÉTENCES CIBLÉES', margin, y);
    y += 8;

    projet.competences_cibles.forEach((comp) => {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(`• ${comp}`, margin + 2, y);
      y += 5;
    });
    y += 5;
  }

  // Learner details table
  if (progressions.length > 0) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('DÉTAIL PAR APPRENANT', margin, y);
    y += 8;

    // Table header
    doc.setFillColor(243, 244, 246);
    doc.rect(margin, y, pageWidth - margin * 2, 7, 'F');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Apprenant', margin + 2, y + 5);
    doc.text('Statut', margin + 60, y + 5);
    doc.text('Progression', margin + 95, y + 5);
    doc.text('Score', margin + 130, y + 5);
    doc.text('Temps', margin + 155, y + 5);
    y += 9;

    doc.setFont('helvetica', 'normal');
    progressions.slice(0, 25).forEach((prog, index) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }

      if (index % 2 === 0) {
        doc.setFillColor(249, 250, 251);
        doc.rect(margin, y - 1, pageWidth - margin * 2, 6, 'F');
      }

      const name = prog.contact ? `${prog.contact.prenom} ${prog.contact.nom}` : '-';
      doc.setTextColor(0, 0, 0);
      doc.text(name.substring(0, 25), margin + 2, y + 3);

      doc.setTextColor(...getStatutColor(prog.statut));
      doc.text(getStatutLabel(prog.statut), margin + 60, y + 3);

      doc.setTextColor(0, 0, 0);
      doc.text(`${prog.progression_pct}%`, margin + 95, y + 3);
      doc.text(`${prog.meilleur_score_pct ?? prog.score_moyen_pct ?? '-'}%`, margin + 130, y + 3);
      doc.text(formatDuration(prog.temps_total_sec), margin + 155, y + 3);

      y += 6;
    });

    if (progressions.length > 25) {
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
      doc.text(`... et ${progressions.length - 25} autres apprenants`, margin, y + 5);
    }
  }

  addFooter(doc, 'Bilan de compétences BIM');

  const fileName = `bilan-competences-bim-${projet.code}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  doc.save(fileName);
}

// ============================================================
// 4. EXPORT TYPES
// ============================================================

export type {
  BimProgressionData,
  BimEvaluationData,
  BimInteractionData,
  CentreFormation,
  AttestationBimOptions,
  FeuillePresenceBimOptions,
  BilanCompetencesBimOptions,
};
