import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Contact {
  id: string;
  nom: string;
  prenom: string;
  email?: string | null;
  telephone?: string | null;
  date_naissance?: string | null;
  ville_naissance?: string | null;
}

interface SessionInfo {
  id: string;
  nom: string;
  formation_type: string;
  date_debut: string;
  date_fin: string;
  lieu?: string | null;
}

type DocumentType = "entree_sortie" | "test_positionnement";

export function useBatchPedagogicalDocuments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      contacts,
      session,
      documentType,
    }: {
      contacts: Contact[];
      session: SessionInfo;
      documentType: DocumentType;
    }) => {
      if (contacts.length === 0) throw new Error("Aucun contact");

      // Create single PDF with multiple pages
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const documentTitle = documentType === "entree_sortie" 
        ? "FICHE D'ENTRÉE / SORTIE DE FORMATION"
        : "TEST DE POSITIONNEMENT";

      contacts.forEach((contact, index) => {
        if (index > 0) {
          doc.addPage();
        }

        const pageWidth = doc.internal.pageSize.getWidth();
        let yPos = 20;

        // Header
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text(documentTitle, pageWidth / 2, yPos, { align: "center" });
        yPos += 15;

        // Session info
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.text(`Formation : ${session.nom}`, 20, yPos);
        yPos += 7;
        doc.text(`Type : ${session.formation_type}`, 20, yPos);
        yPos += 7;
        doc.text(
          `Dates : du ${format(new Date(session.date_debut), "dd/MM/yyyy", { locale: fr })} au ${format(new Date(session.date_fin), "dd/MM/yyyy", { locale: fr })}`,
          20, yPos
        );
        yPos += 7;
        if (session.lieu) {
          doc.text(`Lieu : ${session.lieu}`, 20, yPos);
          yPos += 7;
        }

        yPos += 10;
        doc.setDrawColor(200, 200, 200);
        doc.line(20, yPos, pageWidth - 20, yPos);
        yPos += 15;

        // Trainee info
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("INFORMATIONS STAGIAIRE", 20, yPos);
        yPos += 10;

        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.text(`Nom : ${contact.nom}`, 20, yPos);
        yPos += 7;
        doc.text(`Prénom : ${contact.prenom}`, 20, yPos);
        yPos += 7;
        if (contact.date_naissance) {
          doc.text(`Date de naissance : ${format(new Date(contact.date_naissance), "dd/MM/yyyy", { locale: fr })}`, 20, yPos);
          yPos += 7;
        }
        if (contact.ville_naissance) {
          doc.text(`Lieu de naissance : ${contact.ville_naissance}`, 20, yPos);
          yPos += 7;
        }
        if (contact.email) {
          doc.text(`Email : ${contact.email}`, 20, yPos);
          yPos += 7;
        }
        if (contact.telephone) {
          doc.text(`Téléphone : ${contact.telephone}`, 20, yPos);
          yPos += 7;
        }

        yPos += 15;

        if (documentType === "entree_sortie") {
          // Entry section
          doc.setFont("helvetica", "bold");
          doc.text("ENTRÉE EN FORMATION", 20, yPos);
          yPos += 10;
          
          doc.setFont("helvetica", "normal");
          doc.text("Date d'entrée : _______________", 20, yPos);
          yPos += 7;
          doc.text("Heure d'arrivée : _______________", 20, yPos);
          yPos += 7;
          doc.text("Signature stagiaire :", 20, yPos);
          yPos += 25;

          // Exit section
          doc.setFont("helvetica", "bold");
          doc.text("SORTIE DE FORMATION", 20, yPos);
          yPos += 10;
          
          doc.setFont("helvetica", "normal");
          doc.text("Date de sortie : _______________", 20, yPos);
          yPos += 7;
          doc.text("Heure de départ : _______________", 20, yPos);
          yPos += 7;
          doc.text("Observations : _______________________________________________", 20, yPos);
          yPos += 15;
          doc.text("Signature stagiaire :", 20, yPos);
          yPos += 25;
          doc.text("Signature formateur :", 120, yPos - 25);
        } else {
          // Test de positionnement
          doc.setFont("helvetica", "bold");
          doc.text("ÉVALUATION DES CONNAISSANCES PRÉALABLES", 20, yPos);
          yPos += 15;
          
          doc.setFont("helvetica", "normal");
          const questions = [
            "Niveau de connaissance du secteur T3P (0-10) : ____",
            "Expérience préalable en transport : ________________",
            "Maîtrise du code de la route : □ Bonne  □ Moyenne  □ À améliorer",
            "Connaissance géographique locale : □ Bonne  □ Moyenne  □ À améliorer",
            "Maîtrise des outils numériques : □ Bonne  □ Moyenne  □ À améliorer",
            "Motivations pour la formation :",
            "_______________________________________________",
            "_______________________________________________",
            "Attentes particulières :",
            "_______________________________________________",
            "_______________________________________________",
          ];

          questions.forEach((q) => {
            doc.text(q, 20, yPos);
            yPos += 8;
          });

          yPos += 15;
          doc.text(`Fait le : ${format(new Date(), "dd/MM/yyyy", { locale: fr })}`, 20, yPos);
          yPos += 15;
          doc.text("Signature stagiaire :", 20, yPos);
          doc.text("Signature formateur :", 120, yPos);
        }
      });

      // Download the PDF
      const fileName = documentType === "entree_sortie"
        ? `Fiches_Entree_Sortie_${session.nom.replace(/\s+/g, "_")}.pdf`
        : `Tests_Positionnement_${session.nom.replace(/\s+/g, "_")}.pdf`;

      doc.save(fileName);

      return contacts.length;
    },
    onSuccess: (count, variables) => {
      queryClient.invalidateQueries({ queryKey: ["pedagogical-documents", "session", variables.session.id] });
      const label = variables.documentType === "entree_sortie" 
        ? "Fiches d'entrée/sortie" 
        : "Tests de positionnement";
      toast.success(`${count} ${label} générés`);
    },
    onError: (error) => {
      toast.error("Erreur lors de la génération des documents");
      console.error(error);
    },
  });
}
