/**
 * Générateur de flyers PDF Formation Continue
 * Format A4 recto-verso pour impression
 */

import jsPDF from "jspdf";

type FlyerType = "VTC" | "TAXI" | "VMDTR";

interface FlyerConfig {
  type: FlyerType;
  prix: string;
  couleurPrimaire: [number, number, number]; // RGB
  couleurSecondaire: [number, number, number];
  iconEmoji: string;
  modules: { titre: string; heures: string }[];
  objectifs: string[];
  temoignage: { texte: string; auteur: string };
}

const CONFIGS: Record<FlyerType, FlyerConfig> = {
  VTC: {
    type: "VTC",
    prix: "170€",
    couleurPrimaire: [37, 99, 235], // blue-600
    couleurSecondaire: [30, 64, 175], // blue-800
    iconEmoji: "🚗",
    modules: [
      { titre: "Réglementation T3P", heures: "4h" },
      { titre: "Sécurité routière", heures: "4h" },
      { titre: "Gestion d'entreprise", heures: "3h" },
      { titre: "Relation client", heures: "3h" },
    ],
    objectifs: [
      "Maîtriser les évolutions réglementaires du secteur VTC",
      "Renforcer les compétences en sécurité routière",
      "Optimiser la gestion de votre activité",
      "Améliorer la qualité de service client",
    ],
    temoignage: {
      texte: "Formation très complète et formateurs à l'écoute. J'ai renouvelé ma carte VTC sans problème !",
      auteur: "Karim M., Chauffeur VTC depuis 2018",
    },
  },
  TAXI: {
    type: "TAXI",
    prix: "239€",
    couleurPrimaire: [5, 150, 105], // emerald-600
    couleurSecondaire: [6, 95, 70], // emerald-800
    iconEmoji: "🚕",
    modules: [
      { titre: "Réglementation taxi", heures: "4h" },
      { titre: "Sécurité routière", heures: "4h" },
      { titre: "Gestion d'entreprise", heures: "3h" },
      { titre: "Développement commercial", heures: "3h" },
    ],
    objectifs: [
      "Maîtriser les évolutions réglementaires du secteur taxi",
      "Renforcer les compétences en sécurité routière",
      "Optimiser la gestion de votre activité taxi",
      "Développer votre activité et fidéliser vos clients",
    ],
    temoignage: {
      texte: "Excellente formation ! Les formateurs connaissent parfaitement le métier de taxi. Je recommande !",
      auteur: "Ahmed B., Artisan taxi depuis 2015",
    },
  },
  VMDTR: {
    type: "VMDTR",
    prix: "239€",
    couleurPrimaire: [249, 115, 22], // orange-500
    couleurSecondaire: [194, 65, 12], // orange-700
    iconEmoji: "🏍️",
    modules: [
      { titre: "Réglementation VMDTR", heures: "4h" },
      { titre: "Sécurité routière deux-roues", heures: "4h" },
      { titre: "Gestion d'entreprise", heures: "3h" },
      { titre: "Relation client", heures: "3h" },
    ],
    objectifs: [
      "Maîtriser les évolutions réglementaires du secteur VMDTR",
      "Renforcer les compétences en sécurité routière deux-roues",
      "Optimiser la gestion de votre activité moto-taxi",
      "Améliorer la qualité de service et la relation client",
    ],
    temoignage: {
      texte: "Formation adaptée aux spécificités du moto-taxi. Très satisfait de la qualité des intervenants !",
      auteur: "Youssef K., Moto-taxi depuis 2019",
    },
  },
};

// Couleurs communes
const VERT_FORET: [number, number, number] = [27, 77, 62];
const OR: [number, number, number] = [212, 168, 83];
const BLANC: [number, number, number] = [255, 255, 255];
const GRIS_CLAIR: [number, number, number] = [245, 245, 245];
const GRIS_TEXTE: [number, number, number] = [75, 85, 99];
const ROUGE: [number, number, number] = [239, 68, 68];

function drawRoundedRect(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fillColor: [number, number, number]
) {
  doc.setFillColor(...fillColor);
  doc.roundedRect(x, y, width, height, radius, radius, "F");
}

function generateRectoPage(doc: jsPDF, config: FlyerConfig) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = 0;

  // Header avec gradient simulé
  doc.setFillColor(...config.couleurPrimaire);
  doc.rect(0, 0, pageWidth, 75, "F");
  
  // Bandeau d'alerte rouge
  doc.setFillColor(...ROUGE);
  doc.roundedRect(pageWidth / 2 - 70, 10, 140, 12, 3, 3, "F");
  doc.setTextColor(...BLANC);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("⚠️ OBLIGATOIRE POUR LE RENOUVELLEMENT", pageWidth / 2, 18, { align: "center" });

  // Titre principal
  doc.setTextColor(...BLANC);
  doc.setFontSize(42);
  doc.setFont("helvetica", "bold");
  doc.text(`${config.iconEmoji} ${config.type}`, pageWidth / 2, 45, { align: "center" });
  
  doc.setFontSize(20);
  doc.text("Formation Continue", pageWidth / 2, 58, { align: "center" });
  
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text("Renouvelez votre carte professionnelle", pageWidth / 2, 70, { align: "center" });

  y = 85;

  // Bloc prix
  drawRoundedRect(doc, pageWidth / 2 - 50, y, 100, 40, 8, config.couleurPrimaire);
  doc.setTextColor(...BLANC);
  doc.setFontSize(36);
  doc.setFont("helvetica", "bold");
  doc.text(config.prix, pageWidth / 2, y + 25, { align: "center" });
  doc.setFontSize(12);
  doc.text("TTC - Tout compris", pageWidth / 2, y + 36, { align: "center" });

  y += 55;

  // Avantages clés (4 colonnes)
  const avantages = [
    { titre: "14 heures", sous: "2 jours" },
    { titre: "94% réussite", sous: "Satisfaction" },
    { titre: "10 max", sous: "Petit groupe" },
    { titre: "Qualiopi", sous: "Certifié" },
  ];
  
  const colWidth = (pageWidth - 40) / 4;
  avantages.forEach((av, i) => {
    const x = 20 + i * colWidth + colWidth / 2;
    drawRoundedRect(doc, 20 + i * colWidth + 5, y, colWidth - 10, 35, 5, GRIS_CLAIR);
    doc.setTextColor(...config.couleurPrimaire);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(av.titre, x, y + 15, { align: "center" });
    doc.setTextColor(...GRIS_TEXTE);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(av.sous, x, y + 25, { align: "center" });
  });

  y += 50;

  // Section "Ce que vous obtenez"
  doc.setTextColor(...VERT_FORET);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("✅ Ce que vous obtenez", pageWidth / 2, y, { align: "center" });

  y += 12;

  const avantagesListe = [
    "Attestation de formation immédiate",
    "Validité 5 ans pour votre carte pro",
    `Formateurs experts du secteur ${config.type}`,
    "Supports de cours inclus",
    "Petit groupe (10 personnes max)",
    "Café et collations offerts",
  ];

  const col1X = 25;
  const col2X = pageWidth / 2 + 10;
  
  avantagesListe.forEach((av, i) => {
    const x = i < 3 ? col1X : col2X;
    const yPos = y + (i % 3) * 14;
    doc.setFillColor(...config.couleurPrimaire);
    doc.circle(x, yPos - 2, 2, "F");
    doc.setTextColor(...GRIS_TEXTE);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(av, x + 6, yPos);
  });

  y += 55;

  // CTA Section
  doc.setFillColor(...config.couleurPrimaire);
  doc.rect(0, y, pageWidth, 55, "F");

  doc.setTextColor(...BLANC);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("🎯 INSCRIVEZ-VOUS MAINTENANT !", pageWidth / 2, y + 15, { align: "center" });

  // Bouton téléphone
  drawRoundedRect(doc, pageWidth / 2 - 55, y + 22, 110, 20, 5, OR);
  doc.setTextColor(...VERT_FORET);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("📞 07 83 78 76 63", pageWidth / 2, y + 35, { align: "center" });

  doc.setTextColor(...BLANC);
  doc.setFontSize(10);
  doc.text("📍 3 rue Corneille, 92120 Montrouge", pageWidth / 2, y + 50, { align: "center" });
}

function generateVersoPage(doc: jsPDF, config: FlyerConfig) {
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 0;

  // Header
  doc.setFillColor(...config.couleurPrimaire);
  doc.rect(0, 0, pageWidth, 30, "F");
  doc.setTextColor(...BLANC);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(`Programme de Formation ${config.type} - 14 heures`, pageWidth / 2, 20, { align: "center" });

  y = 45;

  // Modules
  const moduleWidth = (pageWidth - 50) / 2;
  config.modules.forEach((mod, i) => {
    const x = i % 2 === 0 ? 20 : 25 + moduleWidth;
    const yPos = y + Math.floor(i / 2) * 25;
    
    // Bordure gauche colorée
    doc.setFillColor(...config.couleurPrimaire);
    doc.rect(x, yPos, 3, 18, "F");
    
    // Fond du module
    drawRoundedRect(doc, x + 3, yPos, moduleWidth - 8, 18, 3, GRIS_CLAIR);
    
    doc.setTextColor(...GRIS_TEXTE);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(mod.titre, x + 8, yPos + 11);
    
    // Badge heures
    doc.setFillColor(...config.couleurPrimaire);
    doc.roundedRect(x + moduleWidth - 25, yPos + 4, 18, 10, 2, 2, "F");
    doc.setTextColor(...BLANC);
    doc.setFontSize(8);
    doc.text(mod.heures, x + moduleWidth - 16, yPos + 11, { align: "center" });
  });

  y += 65;

  // Objectifs
  doc.setFillColor(config.couleurPrimaire[0], config.couleurPrimaire[1], config.couleurPrimaire[2], 0.1);
  doc.rect(15, y, pageWidth - 30, 55, "F");
  
  doc.setTextColor(...VERT_FORET);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("🎯 Objectifs de la formation", 20, y + 12);

  doc.setTextColor(...GRIS_TEXTE);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  config.objectifs.forEach((obj, i) => {
    doc.setFillColor(...config.couleurPrimaire);
    doc.circle(25, y + 22 + i * 10, 1.5, "F");
    doc.text(obj, 30, y + 24 + i * 10);
  });

  y += 70;

  // Informations pratiques
  doc.setTextColor(...VERT_FORET);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("📋 Informations pratiques", 20, y);

  y += 10;

  const infos = [
    { titre: "Horaires", contenu: "9h00 - 17h00\nPause déjeuner incluse" },
    { titre: "Lieu", contenu: "3 rue Corneille\n92120 Montrouge" },
    { titre: "Paiement", contenu: "CB, espèces\nFacilités de paiement" },
  ];

  const infoWidth = (pageWidth - 50) / 3;
  infos.forEach((info, i) => {
    const x = 20 + i * (infoWidth + 5);
    drawRoundedRect(doc, x, y, infoWidth, 35, 4, BLANC);
    doc.setDrawColor(200, 200, 200);
    doc.roundedRect(x, y, infoWidth, 35, 4, 4, "S");
    
    doc.setTextColor(...config.couleurPrimaire);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(info.titre, x + 5, y + 12);
    
    doc.setTextColor(...GRIS_TEXTE);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    const lines = info.contenu.split("\n");
    lines.forEach((line, li) => {
      doc.text(line, x + 5, y + 22 + li * 8);
    });
  });

  y += 50;

  // Témoignage
  drawRoundedRect(doc, 20, y, pageWidth - 40, 40, 5, GRIS_CLAIR);
  
  // Étoiles
  doc.setTextColor(250, 204, 21);
  doc.setFontSize(12);
  doc.text("★★★★★", pageWidth / 2, y + 12, { align: "center" });
  
  doc.setTextColor(...GRIS_TEXTE);
  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.text(`"${config.temoignage.texte}"`, pageWidth / 2, y + 24, { align: "center", maxWidth: pageWidth - 60 });
  
  doc.setFont("helvetica", "normal");
  doc.text(`— ${config.temoignage.auteur}`, pageWidth / 2, y + 36, { align: "center" });

  y += 55;

  // Footer
  doc.setFillColor(...VERT_FORET);
  doc.rect(0, y, pageWidth, 35, "F");

  doc.setTextColor(...OR);
  doc.setFontSize(10);
  doc.text("🏆 Centre agréé préfecture    |    🛡️ Certification Qualiopi", pageWidth / 2, y + 15, { align: "center" });
  
  doc.setTextColor(255, 255, 255, 0.7);
  doc.setFontSize(8);
  doc.text("ECOLE T3P - 3 rue Corneille, 92120 Montrouge", pageWidth / 2, y + 28, { align: "center" });
}

export function generateFlyerPDF(type: FlyerType): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const config = CONFIGS[type];

  // Page 1 - Recto
  generateRectoPage(doc, config);

  // Page 2 - Verso
  doc.addPage();
  generateVersoPage(doc, config);

  return doc;
}

export function downloadFlyerPDF(type: FlyerType) {
  const doc = generateFlyerPDF(type);
  doc.save(`Flyer-Formation-Continue-${type}.pdf`);
}

export function previewFlyerPDF(type: FlyerType): string {
  const doc = generateFlyerPDF(type);
  return doc.output("bloburl").toString();
}
