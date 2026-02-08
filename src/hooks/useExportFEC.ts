import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";
import * as XLSX from "xlsx";

/**
 * FEC - Fichier des Écritures Comptables
 * Format obligatoire pour l'administration fiscale française (DGFiP)
 * Norme définie par l'article A.47 A-1 du Livre des Procédures Fiscales
 */

// Les 18 colonnes obligatoires du FEC
interface FECLine {
  JournalCode: string;        // Code journal (ex: VE pour ventes)
  JournalLib: string;         // Libellé journal
  EcritureNum: string;        // Numéro d'écriture
  EcritureDate: string;       // Date d'écriture (YYYYMMDD)
  CompteNum: string;          // Numéro de compte (plan comptable)
  CompteLib: string;          // Libellé du compte
  CompAuxNum: string;         // Numéro de compte auxiliaire (client)
  CompAuxLib: string;         // Libellé du compte auxiliaire
  PieceRef: string;           // Référence de la pièce (n° facture)
  PieceDate: string;          // Date de la pièce (YYYYMMDD)
  EcritureLib: string;        // Libellé de l'écriture
  Debit: string;              // Montant débit (format décimal avec virgule)
  Credit: string;             // Montant crédit (format décimal avec virgule)
  EcritureLet: string;        // Lettrage
  DateLet: string;            // Date de lettrage (YYYYMMDD)
  ValidDate: string;          // Date de validation (YYYYMMDD)
  Montantdevise: string;      // Montant en devise
  Idevise: string;            // Identifiant devise (EUR)
}

// Types de paiement vers libellé comptable
const modePaiementToLib: Record<string, string> = {
  cb: "Carte bancaire",
  virement: "Virement bancaire",
  cheque: "Chèque",
  especes: "Espèces",
  cpf: "CPF",
};

// Comptes comptables par défaut
const COMPTES = {
  VENTES: "706000",       // Prestations de services
  CLIENTS: "411000",      // Clients
  BANQUE: "512000",       // Banque
  CAISSE: "530000",       // Caisse (espèces)
  TVA_COLLECTEE: "445710", // TVA collectée
};

function formatDateFEC(dateStr: string | null): string {
  if (!dateStr) return "";
  try {
    return format(new Date(dateStr), "yyyyMMdd");
  } catch {
    return "";
  }
}

function formatMontantFEC(montant: number): string {
  // Format français avec virgule décimale
  return montant.toFixed(2).replace(".", ",");
}

export function useExportFEC() {
  return useMutation({
    mutationFn: async ({ 
      dateFrom, 
      dateTo,
      centreInfo 
    }: { 
      dateFrom: Date; 
      dateTo: Date;
      centreInfo: { siret: string; nom: string } | null;
    }) => {
      // Récupérer les factures émises dans la période
      const { data: factures, error: facturesError } = await supabase
        .from("factures")
        .select(`
          id,
          numero_facture,
          montant_total,
          date_emission,
          statut,
          contact:contacts(id, nom, prenom, custom_id)
        `)
        .gte("date_emission", format(dateFrom, "yyyy-MM-dd"))
        .lte("date_emission", format(dateTo, "yyyy-MM-dd"))
        .in("statut", ["emise", "payee", "partiel", "impayee"])
        .order("date_emission", { ascending: true });

      if (facturesError) throw facturesError;

      // Récupérer les paiements dans la période
      const { data: paiements, error: paiementsError } = await supabase
        .from("paiements")
        .select(`
          id,
          facture_id,
          montant,
          date_paiement,
          mode_paiement,
          reference,
          facture:factures(numero_facture, contact:contacts(id, nom, prenom, custom_id))
        `)
        .gte("date_paiement", format(dateFrom, "yyyy-MM-dd"))
        .lte("date_paiement", format(dateTo, "yyyy-MM-dd"))
        .order("date_paiement", { ascending: true });

      if (paiementsError) throw paiementsError;

      const fecLines: FECLine[] = [];
      let ecritureNum = 1;

      // Générer les écritures de vente (factures)
      for (const facture of factures || []) {
        const contact = facture.contact as any;
        const clientCode = contact?.custom_id || contact?.id?.substring(0, 8) || "CLI";
        const clientLib = contact ? `${contact.prenom} ${contact.nom}`.trim() : "Client";
        const dateEcriture = formatDateFEC(facture.date_emission);
        const montantHT = Number(facture.montant_total);
        const numEcriture = `VE${String(ecritureNum).padStart(6, "0")}`;

        // Ligne client (débit)
        fecLines.push({
          JournalCode: "VE",
          JournalLib: "Journal des ventes",
          EcritureNum: numEcriture,
          EcritureDate: dateEcriture,
          CompteNum: COMPTES.CLIENTS,
          CompteLib: "Clients",
          CompAuxNum: clientCode,
          CompAuxLib: clientLib,
          PieceRef: facture.numero_facture,
          PieceDate: dateEcriture,
          EcritureLib: `Facture ${facture.numero_facture} - ${clientLib}`,
          Debit: formatMontantFEC(montantHT),
          Credit: "",
          EcritureLet: "",
          DateLet: "",
          ValidDate: dateEcriture,
          Montantdevise: "",
          Idevise: "EUR",
        });

        // Ligne ventes (crédit)
        fecLines.push({
          JournalCode: "VE",
          JournalLib: "Journal des ventes",
          EcritureNum: numEcriture,
          EcritureDate: dateEcriture,
          CompteNum: COMPTES.VENTES,
          CompteLib: "Prestations de services",
          CompAuxNum: "",
          CompAuxLib: "",
          PieceRef: facture.numero_facture,
          PieceDate: dateEcriture,
          EcritureLib: `Facture ${facture.numero_facture} - Formation`,
          Debit: "",
          Credit: formatMontantFEC(montantHT),
          EcritureLet: "",
          DateLet: "",
          ValidDate: dateEcriture,
          Montantdevise: "",
          Idevise: "EUR",
        });

        ecritureNum++;
      }

      // Générer les écritures de règlement (paiements)
      for (const paiement of paiements || []) {
        const facture = paiement.facture as any;
        const contact = facture?.contact;
        const clientCode = contact?.custom_id || contact?.id?.substring(0, 8) || "CLI";
        const clientLib = contact ? `${contact.prenom} ${contact.nom}`.trim() : "Client";
        const dateEcriture = formatDateFEC(paiement.date_paiement);
        const montant = Number(paiement.montant);
        const numEcriture = `BQ${String(ecritureNum).padStart(6, "0")}`;
        const modeLib = modePaiementToLib[paiement.mode_paiement] || paiement.mode_paiement;
        const compteBanque = paiement.mode_paiement === "especes" ? COMPTES.CAISSE : COMPTES.BANQUE;
        const compteBanqueLib = paiement.mode_paiement === "especes" ? "Caisse" : "Banque";

        // Ligne banque/caisse (débit)
        fecLines.push({
          JournalCode: "BQ",
          JournalLib: "Journal de banque",
          EcritureNum: numEcriture,
          EcritureDate: dateEcriture,
          CompteNum: compteBanque,
          CompteLib: compteBanqueLib,
          CompAuxNum: "",
          CompAuxLib: "",
          PieceRef: paiement.reference || facture?.numero_facture || "",
          PieceDate: dateEcriture,
          EcritureLib: `Règlement ${modeLib} - ${clientLib}`,
          Debit: formatMontantFEC(montant),
          Credit: "",
          EcritureLet: "",
          DateLet: "",
          ValidDate: dateEcriture,
          Montantdevise: "",
          Idevise: "EUR",
        });

        // Ligne client (crédit)
        fecLines.push({
          JournalCode: "BQ",
          JournalLib: "Journal de banque",
          EcritureNum: numEcriture,
          EcritureDate: dateEcriture,
          CompteNum: COMPTES.CLIENTS,
          CompteLib: "Clients",
          CompAuxNum: clientCode,
          CompAuxLib: clientLib,
          PieceRef: paiement.reference || facture?.numero_facture || "",
          PieceDate: dateEcriture,
          EcritureLib: `Règlement ${modeLib} - Facture ${facture?.numero_facture || ""}`,
          Debit: "",
          Credit: formatMontantFEC(montant),
          EcritureLet: "",
          DateLet: "",
          ValidDate: dateEcriture,
          Montantdevise: "",
          Idevise: "EUR",
        });

        ecritureNum++;
      }

      return {
        lines: fecLines,
        stats: {
          nbFactures: factures?.length || 0,
          nbPaiements: paiements?.length || 0,
          nbEcritures: fecLines.length,
        },
        centreInfo,
        dateFrom,
        dateTo,
      };
    },
    onError: (error: any) => {
      toast.error(`Erreur lors de la génération du FEC: ${error.message}`);
    },
  });
}

export function downloadFEC(
  lines: FECLine[],
  centreInfo: { siret: string; nom: string } | null,
  dateFrom: Date,
  dateTo: Date,
  exportFormat: "txt" | "xlsx" = "txt"
) {
  if (lines.length === 0) {
    toast.error("Aucune écriture à exporter");
    return;
  }

  const siret = centreInfo?.siret?.replace(/\s/g, "") || "00000000000000";
  const dateDebut = format(dateFrom, "yyyyMMdd");
  const dateFin = format(dateTo, "yyyyMMdd");

  if (exportFormat === "txt") {
    // Format FEC officiel : fichier texte tabulé
    const headers = [
      "JournalCode", "JournalLib", "EcritureNum", "EcritureDate",
      "CompteNum", "CompteLib", "CompAuxNum", "CompAuxLib",
      "PieceRef", "PieceDate", "EcritureLib", "Debit", "Credit",
      "EcritureLet", "DateLet", "ValidDate", "Montantdevise", "Idevise"
    ];

    const rows = [
      headers.join("\t"),
      ...lines.map(line => [
        line.JournalCode,
        line.JournalLib,
        line.EcritureNum,
        line.EcritureDate,
        line.CompteNum,
        line.CompteLib,
        line.CompAuxNum,
        line.CompAuxLib,
        line.PieceRef,
        line.PieceDate,
        line.EcritureLib,
        line.Debit,
        line.Credit,
        line.EcritureLet,
        line.DateLet,
        line.ValidDate,
        line.Montantdevise,
        line.Idevise,
      ].join("\t"))
    ];

    const content = rows.join("\r\n");
    const blob = new Blob(["\uFEFF" + content], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    // Nom de fichier FEC normalisé : SIREN + FEC + date
    link.download = `${siret.substring(0, 9)}FEC${dateFin}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast.success(`FEC exporté : ${lines.length} écritures`);
  } else {
    // Export Excel pour visualisation
    const worksheet = XLSX.utils.json_to_sheet(lines);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "FEC");
    
    // Auto-size columns
    const maxWidths = Object.keys(lines[0] || {}).map((key) => {
      const maxLen = Math.max(
        key.length,
        ...lines.map((row) => String(row[key as keyof FECLine] || "").length)
      );
      return { wch: Math.min(maxLen + 2, 40) };
    });
    worksheet["!cols"] = maxWidths;

    XLSX.writeFile(workbook, `FEC_${dateDebut}_${dateFin}.xlsx`);
    toast.success(`FEC Excel exporté : ${lines.length} écritures`);
  }
}
