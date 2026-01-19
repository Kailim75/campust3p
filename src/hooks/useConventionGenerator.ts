// ============================================================
// HOOK POUR LA GÉNÉRATION DE CONVENTIONS T3P
// ============================================================

import { useState, useCallback } from "react";
import { toast } from "sonner";
import {
  type Beneficiaire,
  type Formation,
} from "@/constants/formations";
import {
  generateConventionPDF,
  generateReglementInterieurPDF,
  generateCGVPDF,
  generateConventionZIP,
  downloadPDF,
  downloadBlob,
} from "@/lib/convention-pdf-generator";

export function useConventionGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);

  // Générer et télécharger la convention seule
  const downloadConvention = useCallback(
    async (formation: Formation, beneficiaire: Beneficiaire) => {
      setIsGenerating(true);
      try {
        const pdf = generateConventionPDF(formation, beneficiaire);
        const filename = `Convention_${beneficiaire.nom}_${beneficiaire.prenom}.pdf`;
        downloadPDF(pdf, filename);
        toast.success("Convention téléchargée");
        return true;
      } catch (error) {
        console.error("Erreur génération convention:", error);
        toast.error("Erreur lors de la génération de la convention");
        return false;
      } finally {
        setIsGenerating(false);
      }
    },
    []
  );

  // Générer et télécharger le règlement intérieur
  const downloadReglementInterieur = useCallback(async () => {
    setIsGenerating(true);
    try {
      const pdf = generateReglementInterieurPDF();
      downloadPDF(pdf, "Reglement_Interieur_T3P_CAMPUS.pdf");
      toast.success("Règlement intérieur téléchargé");
      return true;
    } catch (error) {
      console.error("Erreur génération règlement:", error);
      toast.error("Erreur lors de la génération du règlement");
      return false;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  // Générer et télécharger les CGV
  const downloadCGV = useCallback(async () => {
    setIsGenerating(true);
    try {
      const pdf = generateCGVPDF();
      downloadPDF(pdf, "CGV_T3P_CAMPUS.pdf");
      toast.success("CGV téléchargées");
      return true;
    } catch (error) {
      console.error("Erreur génération CGV:", error);
      toast.error("Erreur lors de la génération des CGV");
      return false;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  // Générer et télécharger le ZIP complet
  const downloadAllDocuments = useCallback(
    async (formation: Formation, beneficiaire: Beneficiaire) => {
      setIsGenerating(true);
      try {
        const zipBlob = await generateConventionZIP(formation, beneficiaire);
        const filename = `Documents_Convention_${beneficiaire.nom}_${beneficiaire.prenom}.zip`;
        downloadBlob(zipBlob, filename);
        toast.success("Archive ZIP téléchargée (3 documents)");
        return true;
      } catch (error) {
        console.error("Erreur génération ZIP:", error);
        toast.error("Erreur lors de la génération de l'archive");
        return false;
      } finally {
        setIsGenerating(false);
      }
    },
    []
  );

  // Prévisualiser un document (retourne le blob URL)
  const previewConvention = useCallback(
    (formation: Formation, beneficiaire: Beneficiaire): string | null => {
      try {
        const pdf = generateConventionPDF(formation, beneficiaire);
        const blob = pdf.output("blob");
        return URL.createObjectURL(blob);
      } catch (error) {
        console.error("Erreur prévisualisation:", error);
        return null;
      }
    },
    []
  );

  const previewReglementInterieur = useCallback((): string | null => {
    try {
      const pdf = generateReglementInterieurPDF();
      const blob = pdf.output("blob");
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error("Erreur prévisualisation:", error);
      return null;
    }
  }, []);

  const previewCGV = useCallback((): string | null => {
    try {
      const pdf = generateCGVPDF();
      const blob = pdf.output("blob");
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error("Erreur prévisualisation:", error);
      return null;
    }
  }, []);

  return {
    isGenerating,
    downloadConvention,
    downloadReglementInterieur,
    downloadCGV,
    downloadAllDocuments,
    previewConvention,
    previewReglementInterieur,
    previewCGV,
  };
}
