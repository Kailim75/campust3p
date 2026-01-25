import jsPDF from "jspdf";
import { GdprProcessing } from "@/hooks/useGdprProcessingRegister";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export function generateGdprRegisterPdf(processings: GdprProcessing[], centreName?: string): jsPDF {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let y = margin;

  // Helper function to add new page if needed
  const checkPageBreak = (requiredHeight: number) => {
    if (y + requiredHeight > pageHeight - margin) {
      doc.addPage();
      y = margin;
      return true;
    }
    return false;
  };

  // Header
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("REGISTRE DES TRAITEMENTS DE DONNÉES PERSONNELLES", pageWidth / 2, y, { align: "center" });
  y += 8;

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text("Conformément à l'article 30 du RGPD (UE 2016/679)", pageWidth / 2, y, { align: "center" });
  y += 8;

  if (centreName) {
    doc.setFontSize(11);
    doc.text(`Organisme : ${centreName}`, pageWidth / 2, y, { align: "center" });
    y += 6;
  }

  doc.setFontSize(10);
  doc.text(`Généré le : ${format(new Date(), "dd MMMM yyyy à HH:mm", { locale: fr })}`, pageWidth / 2, y, { align: "center" });
  y += 12;

  // Summary
  const activeCount = processings.filter(p => p.statut === 'actif').length;
  doc.setFillColor(240, 240, 245);
  doc.rect(margin, y, pageWidth - 2 * margin, 10, "F");
  doc.setFontSize(10);
  doc.text(`Nombre de traitements actifs : ${activeCount}`, margin + 5, y + 6);
  y += 15;

  // Process each treatment
  processings.filter(p => p.statut === 'actif').forEach((processing, index) => {
    checkPageBreak(80);

    // Treatment header
    doc.setFillColor(59, 130, 246);
    doc.rect(margin, y, pageWidth - 2 * margin, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(`${processing.code} - ${processing.nom_traitement}`, margin + 3, y + 5.5);
    doc.setTextColor(0, 0, 0);
    y += 12;

    // Content grid
    const leftCol = margin;
    const rightCol = pageWidth / 2 + 5;
    const colWidth = (pageWidth - 2 * margin - 10) / 2;

    const addField = (label: string, value: string | null | undefined, x: number, currentY: number): number => {
      if (!value) return currentY;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(label, x, currentY);
      doc.setFont("helvetica", "normal");
      const lines = doc.splitTextToSize(value, colWidth - 5);
      doc.text(lines, x, currentY + 4);
      return currentY + 4 + lines.length * 4;
    };

    // Left column
    let leftY = y;
    leftY = addField("Finalités :", processing.finalites, leftCol, leftY);
    leftY = addField("Base légale :", processing.base_legale, leftCol, leftY + 2);
    leftY = addField("Catégories de personnes :", processing.categories_personnes?.join(", "), leftCol, leftY + 2);
    leftY = addField("Catégories de données :", processing.categories_donnees?.join(", "), leftCol, leftY + 2);

    // Right column
    let rightY = y;
    rightY = addField("Destinataires :", processing.destinataires?.join(", "), rightCol, rightY);
    rightY = addField("Délais de conservation :", processing.delais_conservation, rightCol, rightY + 2);
    rightY = addField("Mesures de sécurité :", processing.mesures_securite?.join(", "), rightCol, rightY + 2);
    rightY = addField("Responsable :", processing.responsable_traitement, rightCol, rightY + 2);

    y = Math.max(leftY, rightY) + 8;

    // Separator
    if (index < processings.length - 1) {
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, y, pageWidth - margin, y);
      y += 5;
    }
  });

  // Footer on last page
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text(
    "Document confidentiel - Usage interne et audit CNIL/Qualiopi",
    pageWidth / 2,
    pageHeight - 8,
    { align: "center" }
  );

  return doc;
}
