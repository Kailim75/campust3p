import jsPDF from "jspdf";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface QualiopiPreuve {
  id: string;
  indicateur_id: string;
  titre: string;
  description: string | null;
  type_preuve: string;
  fichier_url: string | null;
  date_ajout: string;
  valide: boolean;
  commentaire: string | null;
}

interface QualiopiIndicateur {
  id: string;
  numero: string;
  critere: number;
  titre: string;
  description: string | null;
}

interface QualiopiAction {
  id: string;
  indicateur_id: string;
  titre: string;
  description: string | null;
  statut: string;
  priorite: string;
  date_echeance: string | null;
  responsable: string | null;
}

interface CentreInfo {
  nom_commercial: string;
  nom_legal: string;
  siret: string;
  nda: string;
  adresse_complete: string;
  qualiopi_numero?: string | null;
  qualiopi_date_obtention?: string | null;
  qualiopi_date_expiration?: string | null;
}

interface AuditReportData {
  centre: CentreInfo;
  indicateurs: QualiopiIndicateur[];
  preuves: QualiopiPreuve[];
  actions: QualiopiAction[];
  globalScore: number;
  criteriaScores: { critere: number; score: number; label: string }[];
}

export function generateQualiopiAuditPDF(data: AuditReportData): Blob {
  const pdf = new jsPDF("p", "mm", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let yPos = margin;

  const addNewPage = () => {
    pdf.addPage();
    yPos = margin;
  };

  const checkPageBreak = (height: number) => {
    if (yPos + height > pageHeight - 20) {
      addNewPage();
      return true;
    }
    return false;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE DE GARDE
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Fond coloré header
  pdf.setFillColor(27, 77, 62); // Vert forêt T3P
  pdf.rect(0, 0, pageWidth, 60, "F");

  // Titre principal
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(24);
  pdf.text("RAPPORT D'AUDIT QUALIOPI", pageWidth / 2, 25, { align: "center" });

  pdf.setFontSize(14);
  pdf.setFont("helvetica", "normal");
  pdf.text("Référentiel National Qualité - 7 Critères, 32 Indicateurs", pageWidth / 2, 38, { align: "center" });

  pdf.setFontSize(12);
  pdf.text(`Généré le ${format(new Date(), "dd MMMM yyyy", { locale: fr })}`, pageWidth / 2, 50, { align: "center" });

  yPos = 75;

  // Informations du centre
  pdf.setTextColor(30, 30, 30);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.text("ORGANISME DE FORMATION", margin, yPos);
  yPos += 10;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  
  const centreInfo = [
    [`Raison sociale :`, data.centre.nom_commercial],
    [`SIRET :`, data.centre.siret],
    [`N° Déclaration Activité :`, data.centre.nda],
    [`Adresse :`, data.centre.adresse_complete],
  ];

  if (data.centre.qualiopi_numero) {
    centreInfo.push([`N° Certificat Qualiopi :`, data.centre.qualiopi_numero]);
  }
  if (data.centre.qualiopi_date_obtention) {
    centreInfo.push([`Date d'obtention :`, format(new Date(data.centre.qualiopi_date_obtention), "dd/MM/yyyy")]);
  }
  if (data.centre.qualiopi_date_expiration) {
    centreInfo.push([`Date d'expiration :`, format(new Date(data.centre.qualiopi_date_expiration), "dd/MM/yyyy")]);
  }

  centreInfo.forEach(([label, value]) => {
    pdf.setFont("helvetica", "bold");
    pdf.text(label, margin, yPos);
    pdf.setFont("helvetica", "normal");
    pdf.text(value || "-", margin + 55, yPos);
    yPos += 6;
  });

  yPos += 15;

  // Score global
  pdf.setFillColor(245, 245, 245);
  pdf.roundedRect(margin, yPos, contentWidth, 35, 3, 3, "F");
  
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.setTextColor(30, 30, 30);
  pdf.text("SCORE GLOBAL DE CONFORMITÉ", margin + 10, yPos + 12);
  
  const scoreColor = data.globalScore >= 80 
    ? [39, 174, 96]   // Vert
    : data.globalScore >= 60 
      ? [243, 156, 18] // Orange
      : [231, 76, 60]; // Rouge
  
  pdf.setFontSize(32);
  pdf.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2]);
  pdf.text(`${data.globalScore}%`, pageWidth - margin - 30, yPos + 25, { align: "center" });
  
  yPos += 45;

  // Scores par critère
  pdf.setTextColor(30, 30, 30);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.text("CONFORMITÉ PAR CRITÈRE", margin, yPos);
  yPos += 8;

  const barHeight = 8;
  const barWidth = contentWidth - 40;

  data.criteriaScores.forEach((c) => {
    checkPageBreak(15);
    
    // Label
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.text(`C${c.critere}. ${c.label}`, margin, yPos + 5);
    
    // Barre de progression
    const barY = yPos;
    const barX = margin;
    
    // Fond gris
    pdf.setFillColor(230, 230, 230);
    pdf.roundedRect(barX, barY + 7, barWidth, barHeight, 1, 1, "F");
    
    // Barre colorée
    const fillWidth = (c.score / 100) * barWidth;
    const barColor = c.score >= 80 
      ? [39, 174, 96] 
      : c.score >= 60 
        ? [243, 156, 18] 
        : [231, 76, 60];
    pdf.setFillColor(barColor[0], barColor[1], barColor[2]);
    if (fillWidth > 0) {
      pdf.roundedRect(barX, barY + 7, fillWidth, barHeight, 1, 1, "F");
    }
    
    // Pourcentage
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.text(`${c.score}%`, pageWidth - margin - 10, barY + 13, { align: "right" });
    
    yPos += 18;
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DÉTAIL DES INDICATEURS ET PREUVES
  // ═══════════════════════════════════════════════════════════════════════════
  addNewPage();
  
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.setTextColor(27, 77, 62);
  pdf.text("DÉTAIL DES INDICATEURS ET PREUVES", margin, yPos);
  yPos += 12;

  // Grouper par critère
  const criteres = [1, 2, 3, 4, 5, 6, 7];
  const critereLabels: Record<number, string> = {
    1: "Conditions d'information du public",
    2: "Identification précise des objectifs et adaptation",
    3: "Adaptation aux bénéficiaires",
    4: "Moyens pédagogiques et techniques",
    5: "Qualification du personnel",
    6: "Inscription dans l'environnement socio-économique",
    7: "Recueil et prise en compte des appréciations",
  };

  criteres.forEach((critereNum) => {
    checkPageBreak(30);
    
    const indicateursForCritere = data.indicateurs.filter(i => i.critere === critereNum);
    if (indicateursForCritere.length === 0) return;

    // Titre du critère
    pdf.setFillColor(240, 240, 240);
    pdf.rect(margin, yPos - 5, contentWidth, 12, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.setTextColor(27, 77, 62);
    pdf.text(`CRITÈRE ${critereNum} : ${critereLabels[critereNum]}`, margin + 3, yPos + 3);
    yPos += 15;

    indicateursForCritere.forEach((indicateur) => {
      checkPageBreak(25);
      
      const preuvesForIndicateur = data.preuves.filter(p => p.indicateur_id === indicateur.id);
      const actionsForIndicateur = data.actions.filter(a => a.indicateur_id === indicateur.id);
      
      // Indicateur
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.setTextColor(30, 30, 30);
      pdf.text(`Indicateur ${indicateur.numero}`, margin, yPos);
      yPos += 5;
      
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      const lines = pdf.splitTextToSize(indicateur.titre, contentWidth - 10);
      pdf.text(lines, margin + 5, yPos);
      yPos += lines.length * 4 + 3;

      // Preuves
      if (preuvesForIndicateur.length > 0) {
        pdf.setFont("helvetica", "italic");
        pdf.setFontSize(8);
        pdf.setTextColor(100, 100, 100);
        pdf.text(`Preuves (${preuvesForIndicateur.length}):`, margin + 10, yPos);
        yPos += 4;
        
        preuvesForIndicateur.forEach((preuve) => {
          checkPageBreak(8);
          const statusIcon = preuve.valide ? "✓" : "○";
          const statusColor = preuve.valide ? [39, 174, 96] : [200, 200, 200];
          pdf.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
          pdf.text(statusIcon, margin + 12, yPos);
          pdf.setTextColor(80, 80, 80);
          pdf.text(preuve.titre, margin + 18, yPos);
          yPos += 4;
        });
      }

      // Actions en cours
      const pendingActions = actionsForIndicateur.filter(a => a.statut !== "termine");
      if (pendingActions.length > 0) {
        checkPageBreak(8);
        pdf.setTextColor(243, 156, 18);
        pdf.text(`⚠ ${pendingActions.length} action(s) en cours`, margin + 10, yPos);
        yPos += 4;
      }

      yPos += 5;
    });

    yPos += 5;
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTIONS CORRECTIVES EN COURS
  // ═══════════════════════════════════════════════════════════════════════════
  const pendingActions = data.actions.filter(a => a.statut !== "termine");
  
  if (pendingActions.length > 0) {
    addNewPage();
    
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.setTextColor(27, 77, 62);
    pdf.text("ACTIONS CORRECTIVES EN COURS", margin, yPos);
    yPos += 12;

    pendingActions.forEach((action, index) => {
      checkPageBreak(25);
      
      const indicateur = data.indicateurs.find(i => i.id === action.indicateur_id);
      
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.setTextColor(30, 30, 30);
      pdf.text(`${index + 1}. ${action.titre}`, margin, yPos);
      yPos += 5;
      
      if (indicateur) {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.setTextColor(100, 100, 100);
        pdf.text(`Indicateur ${indicateur.numero} (Critère ${indicateur.critere})`, margin + 5, yPos);
        yPos += 4;
      }
      
      if (action.date_echeance) {
        pdf.text(`Échéance: ${format(new Date(action.date_echeance), "dd/MM/yyyy")}`, margin + 5, yPos);
        yPos += 4;
      }
      
      if (action.responsable) {
        pdf.text(`Responsable: ${action.responsable}`, margin + 5, yPos);
        yPos += 4;
      }
      
      // Statut
      const statusColors: Record<string, number[]> = {
        a_faire: [231, 76, 60],
        en_cours: [243, 156, 18],
        termine: [39, 174, 96],
      };
      const statusLabels: Record<string, string> = {
        a_faire: "À faire",
        en_cours: "En cours",
        termine: "Terminé",
      };
      const color = statusColors[action.statut] || [100, 100, 100];
      pdf.setTextColor(color[0], color[1], color[2]);
      pdf.setFont("helvetica", "bold");
      pdf.text(`Statut: ${statusLabels[action.statut] || action.statut}`, margin + 5, yPos);
      yPos += 8;
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PIED DE PAGE
  // ═══════════════════════════════════════════════════════════════════════════
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    pdf.text(
      `Page ${i}/${totalPages} - Rapport Qualiopi - ${data.centre.nom_commercial}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );
  }

  return pdf.output("blob");
}
