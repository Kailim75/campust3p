import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { QualiopiIndicateur } from '@/hooks/useQualiopiIndicateurs';
import { QualiopiAudit } from '@/hooks/useQualiopiAudits';

const CRITERES_LABELS: Record<number, string> = {
  1: 'Information du public sur les prestations',
  2: 'Identification précise des objectifs des prestations',
  3: 'Adaptation aux publics bénéficiaires',
  4: 'Adéquation des moyens pédagogiques, techniques et d\'encadrement',
  5: 'Qualification et développement des connaissances et compétences des personnels',
  6: 'Inscription et investissement du prestataire dans son environnement professionnel',
  7: 'Recueil et prise en compte des appréciations et des réclamations'
};

interface QualiopiPDFOptions {
  indicateurs: QualiopiIndicateur[];
  audits?: QualiopiAudit[];
  centreName?: string;
}

export function generateQualiopiSynthesisPDF({ indicateurs, audits, centreName }: QualiopiPDFOptions): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPosition = margin;

  // Helper functions
  const addText = (text: string, x: number, y: number, options?: { fontSize?: number; fontStyle?: 'normal' | 'bold'; color?: [number, number, number]; maxWidth?: number }) => {
    doc.setFontSize(options?.fontSize || 10);
    doc.setFont('helvetica', options?.fontStyle || 'normal');
    if (options?.color) {
      doc.setTextColor(options.color[0], options.color[1], options.color[2]);
    } else {
      doc.setTextColor(0, 0, 0);
    }
    if (options?.maxWidth) {
      doc.text(text, x, y, { maxWidth: options.maxWidth });
    } else {
      doc.text(text, x, y);
    }
  };

  const addProgressBar = (x: number, y: number, width: number, height: number, percentage: number) => {
    // Background
    doc.setFillColor(229, 231, 235); // gray-200
    doc.rect(x, y, width, height, 'F');
    
    // Progress fill
    const fillWidth = (percentage / 100) * width;
    if (percentage === 100) {
      doc.setFillColor(34, 197, 94); // green-500
    } else if (percentage >= 50) {
      doc.setFillColor(59, 130, 246); // blue-500
    } else {
      doc.setFillColor(239, 68, 68); // red-500
    }
    doc.rect(x, y, fillWidth, height, 'F');
  };

  const checkNewPage = (neededSpace: number) => {
    if (yPosition + neededSpace > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };

  // ========== HEADER ==========
  addText('SYNTHÈSE QUALIOPI', margin, yPosition, { fontSize: 20, fontStyle: 'bold', color: [37, 99, 235] });
  yPosition += 8;
  
  addText('Référentiel National Qualité - 7 critères, 32 indicateurs', margin, yPosition, { fontSize: 10, color: [107, 114, 128] });
  yPosition += 6;
  
  if (centreName) {
    addText(centreName, margin, yPosition, { fontSize: 10, fontStyle: 'bold' });
    yPosition += 6;
  }
  
  addText(`Généré le ${format(new Date(), 'dd MMMM yyyy à HH:mm', { locale: fr })}`, margin, yPosition, { fontSize: 9, color: [107, 114, 128] });
  yPosition += 12;

  // Line separator
  doc.setDrawColor(229, 231, 235);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 10;

  // ========== GLOBAL STATS ==========
  const stats = {
    conformes: indicateurs.filter(i => i.statut === 'conforme').length,
    partiels: indicateurs.filter(i => i.statut === 'partiellement_conforme').length,
    nonConformes: indicateurs.filter(i => i.statut === 'non_conforme').length,
    total: indicateurs.length
  };
  const tauxConformite = stats.total > 0 ? Math.round((stats.conformes / stats.total) * 100) : 0;

  addText('TAUX DE CONFORMITÉ GLOBAL', margin, yPosition, { fontSize: 12, fontStyle: 'bold' });
  yPosition += 8;

  // Big percentage
  addText(`${tauxConformite}%`, margin, yPosition, { fontSize: 28, fontStyle: 'bold', color: tauxConformite >= 80 ? [34, 197, 94] : tauxConformite >= 50 ? [59, 130, 246] : [239, 68, 68] });
  
  // Stats on the right
  addText(`${stats.conformes} conforme${stats.conformes > 1 ? 's' : ''}`, margin + 40, yPosition - 4, { fontSize: 10, color: [34, 197, 94] });
  addText(`${stats.partiels} partiel${stats.partiels > 1 ? 's' : ''}`, margin + 40, yPosition + 2, { fontSize: 10, color: [249, 115, 22] });
  addText(`${stats.nonConformes} non conforme${stats.nonConformes > 1 ? 's' : ''}`, margin + 40, yPosition + 8, { fontSize: 10, color: [239, 68, 68] });
  
  yPosition += 6;
  addProgressBar(margin + 80, yPosition - 8, 80, 6, tauxConformite);
  yPosition += 16;

  // ========== PROGRESSION PAR CRITÈRE ==========
  addText('PROGRESSION PAR CRITÈRE', margin, yPosition, { fontSize: 12, fontStyle: 'bold' });
  yPosition += 10;

  for (let critere = 1; critere <= 7; critere++) {
    checkNewPage(20);
    
    const indicateursCritere = indicateurs.filter(i => i.critere === critere);
    const conformesCritere = indicateursCritere.filter(i => i.statut === 'conforme').length;
    const partielsCritere = indicateursCritere.filter(i => i.statut === 'partiellement_conforme').length;
    const tauxCritere = indicateursCritere.length > 0 ? Math.round((conformesCritere / indicateursCritere.length) * 100) : 0;

    // Critère number and label
    addText(`Critère ${critere}`, margin, yPosition, { fontSize: 10, fontStyle: 'bold' });
    addText(`${conformesCritere}/${indicateursCritere.length}`, pageWidth - margin - 20, yPosition, { fontSize: 10, fontStyle: 'bold' });
    yPosition += 5;
    
    addText(CRITERES_LABELS[critere], margin, yPosition, { fontSize: 8, color: [107, 114, 128], maxWidth: pageWidth - margin * 2 - 30 });
    yPosition += 5;
    
    // Progress bar
    addProgressBar(margin, yPosition, pageWidth - margin * 2, 4, tauxCritere);
    yPosition += 10;
  }

  // ========== LISTE DES NON-CONFORMITÉS ==========
  yPosition += 5;
  checkNewPage(30);
  
  addText('INDICATEURS NON CONFORMES', margin, yPosition, { fontSize: 12, fontStyle: 'bold', color: [239, 68, 68] });
  yPosition += 10;

  const nonConformes = indicateurs.filter(i => i.statut === 'non_conforme' || i.statut === 'partiellement_conforme');
  
  if (nonConformes.length === 0) {
    addText('✓ Tous les indicateurs sont conformes !', margin, yPosition, { fontSize: 10, color: [34, 197, 94] });
    yPosition += 10;
  } else {
    // Group by criterion
    const groupedNonConformes = nonConformes.reduce((acc, ind) => {
      if (!acc[ind.critere]) acc[ind.critere] = [];
      acc[ind.critere].push(ind);
      return acc;
    }, {} as Record<number, QualiopiIndicateur[]>);

    for (const [critere, inds] of Object.entries(groupedNonConformes)) {
      checkNewPage(20 + inds.length * 15);
      
      addText(`Critère ${critere}`, margin, yPosition, { fontSize: 10, fontStyle: 'bold', color: [107, 114, 128] });
      yPosition += 6;

      for (const ind of inds) {
        checkNewPage(15);
        
        const statusColor: [number, number, number] = ind.statut === 'non_conforme' ? [239, 68, 68] : [249, 115, 22];
        const statusLabel = ind.statut === 'non_conforme' ? '✗ Non conforme' : '⚠ Partiel';
        
        addText(`Indicateur ${ind.numero}`, margin + 5, yPosition, { fontSize: 9, fontStyle: 'bold' });
        addText(statusLabel, pageWidth - margin - 30, yPosition, { fontSize: 8, color: statusColor });
        yPosition += 4;
        
        addText(ind.titre, margin + 5, yPosition, { fontSize: 9, maxWidth: pageWidth - margin * 2 - 40 });
        yPosition += 5;
        
        // Description (truncated)
        const shortDesc = ind.description.length > 100 ? ind.description.substring(0, 100) + '...' : ind.description;
        addText(shortDesc, margin + 5, yPosition, { fontSize: 8, color: [107, 114, 128], maxWidth: pageWidth - margin * 2 - 10 });
        yPosition += 8;
      }
      yPosition += 4;
    }
  }

  // ========== PREUVES ATTENDUES ==========
  if (nonConformes.length > 0) {
    checkNewPage(40);
    yPosition += 5;
    
    addText('PREUVES À FOURNIR', margin, yPosition, { fontSize: 12, fontStyle: 'bold' });
    yPosition += 10;

    const allPreuves = new Map<string, string[]>();
    nonConformes.forEach(ind => {
      if (ind.preuves_attendues && ind.preuves_attendues.length > 0) {
        ind.preuves_attendues.forEach(preuve => {
          if (!allPreuves.has(preuve)) {
            allPreuves.set(preuve, []);
          }
          allPreuves.get(preuve)!.push(`Ind. ${ind.numero}`);
        });
      }
    });

    if (allPreuves.size === 0) {
      addText('Aucune preuve spécifique requise.', margin, yPosition, { fontSize: 9, color: [107, 114, 128] });
    } else {
      const sortedPreuves = Array.from(allPreuves.entries()).sort((a, b) => b[1].length - a[1].length);
      
      for (const [preuve, indicateursRefs] of sortedPreuves.slice(0, 15)) {
        checkNewPage(10);
        addText(`• ${preuve}`, margin + 5, yPosition, { fontSize: 9 });
        addText(`(${indicateursRefs.join(', ')})`, pageWidth - margin - 40, yPosition, { fontSize: 7, color: [107, 114, 128] });
        yPosition += 5;
      }
      
      if (sortedPreuves.length > 15) {
        addText(`... et ${sortedPreuves.length - 15} autres preuves`, margin + 5, yPosition, { fontSize: 8, color: [107, 114, 128] });
      }
    }
  }

  // ========== HISTORIQUE DES AUDITS ==========
  if (audits && audits.length > 0) {
    checkNewPage(50);
    yPosition += 10;
    
    addText('HISTORIQUE DES AUDITS', margin, yPosition, { fontSize: 12, fontStyle: 'bold' });
    yPosition += 10;

    const getTypeLabel = (type: string) => {
      const labels: Record<string, string> = {
        'initial': 'Audit Initial',
        'surveillance': 'Audit de Surveillance',
        'renouvellement': 'Audit de Renouvellement',
        'interne': 'Audit Interne'
      };
      return labels[type] || type;
    };

    const getStatutLabel = (statut: string) => {
      const labels: Record<string, string> = {
        'planifie': 'Planifié',
        'en_cours': 'En cours',
        'termine': 'Terminé',
        'certifie': 'Certifié'
      };
      return labels[statut] || statut;
    };

    const getStatutColor = (statut: string): [number, number, number] => {
      switch (statut) {
        case 'certifie': return [34, 197, 94];
        case 'termine': return [59, 130, 246];
        case 'en_cours': return [249, 115, 22];
        default: return [107, 114, 128];
      }
    };

    for (const audit of audits) {
      checkNewPage(30);
      
      // Audit type and date
      addText(getTypeLabel(audit.type_audit), margin, yPosition, { fontSize: 10, fontStyle: 'bold' });
      addText(format(new Date(audit.date_audit), 'dd/MM/yyyy', { locale: fr }), margin + 60, yPosition, { fontSize: 9, color: [107, 114, 128] });
      
      // Status
      addText(getStatutLabel(audit.statut), pageWidth - margin - 30, yPosition, { fontSize: 9, color: getStatutColor(audit.statut) });
      yPosition += 5;
      
      // Organisme
      if (audit.organisme_certificateur) {
        addText(`Organisme: ${audit.organisme_certificateur}`, margin + 5, yPosition, { fontSize: 8, color: [107, 114, 128] });
        yPosition += 4;
      }
      
      // Score and non-conformities
      const scoreInfo: string[] = [];
      if (audit.score_global !== null) {
        scoreInfo.push(`Score: ${audit.score_global}%`);
      }
      if (audit.non_conformites_majeures > 0) {
        scoreInfo.push(`${audit.non_conformites_majeures} NC majeure${audit.non_conformites_majeures > 1 ? 's' : ''}`);
      }
      if (audit.non_conformites_mineures > 0) {
        scoreInfo.push(`${audit.non_conformites_mineures} NC mineure${audit.non_conformites_mineures > 1 ? 's' : ''}`);
      }
      
      if (scoreInfo.length > 0) {
        const scoreColor: [number, number, number] = audit.score_global !== null && audit.score_global >= 80 
          ? [34, 197, 94] 
          : audit.score_global !== null && audit.score_global >= 50 
            ? [59, 130, 246] 
            : [239, 68, 68];
        addText(scoreInfo.join(' • '), margin + 5, yPosition, { fontSize: 9, color: scoreColor });
        yPosition += 4;
      }
      
      // Next deadline
      if (audit.date_prochaine_echeance) {
        addText(`Prochaine échéance: ${format(new Date(audit.date_prochaine_echeance), 'dd/MM/yyyy', { locale: fr })}`, margin + 5, yPosition, { fontSize: 8, color: [107, 114, 128] });
        yPosition += 4;
      }
      
      // Observations (truncated)
      if (audit.observations) {
        const shortObs = audit.observations.length > 80 ? audit.observations.substring(0, 80) + '...' : audit.observations;
        addText(shortObs, margin + 5, yPosition, { fontSize: 8, color: [107, 114, 128], maxWidth: pageWidth - margin * 2 - 10 });
        yPosition += 4;
      }
      
      yPosition += 6;
    }
  }

  // ========== FOOTER ==========
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text(`Page ${i}/${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
    doc.text('Synthèse Qualiopi - Document généré automatiquement', margin, pageHeight - 10);
  }

  // Save the PDF
  const fileName = `synthese-qualiopi-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  doc.save(fileName);
}
