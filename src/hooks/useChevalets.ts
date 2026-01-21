import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import jsPDF from "jspdf";

export interface Chevalet {
  id: string;
  contact_id: string;
  formation_type: string;
  pdf_path: string | null;
  generated_at: string;
  created_by: string | null;
}

export function useChevalets(contactId?: string) {
  return useQuery({
    queryKey: ["chevalets", contactId],
    queryFn: async () => {
      let query = supabase
        .from("chevalets")
        .select("*")
        .order("generated_at", { ascending: false });

      if (contactId) {
        query = query.eq("contact_id", contactId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Chevalet[];
    },
    enabled: contactId ? !!contactId : true,
  });
}

interface GenerateChevaletParams {
  contactId: string;
  prenom: string;
  formationType: string;
  logoUrl?: string;
}

export function useGenerateChevalet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contactId, prenom, formationType, logoUrl }: GenerateChevaletParams) => {
      // Generate PDF A6 portrait (105mm x 148mm)
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [105, 148],
      });

      // Background
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, 105, 148, "F");

      // Border
      doc.setDrawColor(59, 130, 246);
      doc.setLineWidth(2);
      doc.rect(5, 5, 95, 138, "S");

      // Logo placeholder area
      if (logoUrl) {
        try {
          // Try to load logo
          doc.setFillColor(240, 240, 240);
          doc.rect(27.5, 15, 50, 25, "F");
          doc.setFontSize(8);
          doc.setTextColor(150, 150, 150);
          doc.text("LOGO", 52.5, 30, { align: "center" });
        } catch {
          // Skip logo on error
        }
      } else {
        doc.setFillColor(240, 240, 240);
        doc.rect(27.5, 15, 50, 25, "F");
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text("LOGO", 52.5, 30, { align: "center" });
      }

      // Formation type badge
      doc.setFillColor(59, 130, 246);
      doc.roundedRect(17.5, 50, 70, 15, 3, 3, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(`Formation ${formationType}`, 52.5, 60, { align: "center" });

      // Prénom
      doc.setTextColor(30, 30, 30);
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text(prenom.toUpperCase(), 52.5, 95, { align: "center" });

      // Decorative line
      doc.setDrawColor(59, 130, 246);
      doc.setLineWidth(0.5);
      doc.line(25, 105, 80, 105);

      // "STAGIAIRE" label
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("STAGIAIRE", 52.5, 115, { align: "center" });

      // Generate blob
      const pdfBlob = doc.output("blob");
      const fileName = `chevalet_${contactId}_${Date.now()}.pdf`;
      const filePath = `chevalets/${contactId}/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("pedagogie")
        .upload(filePath, pdfBlob, { contentType: "application/pdf" });

      if (uploadError) throw uploadError;

      // Save record
      const { data, error } = await supabase
        .from("chevalets")
        .insert({
          contact_id: contactId,
          formation_type: formationType,
          pdf_path: filePath,
        })
        .select()
        .single();

      if (error) throw error;

      // Also trigger download
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Chevalet_${prenom}_${formationType}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["chevalets", variables.contactId] });
      toast.success("Chevalet généré et téléchargé");
    },
    onError: (error) => {
      toast.error("Erreur lors de la génération du chevalet");
      console.error(error);
    },
  });
}

export function useGenerateBatchChevalets() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contacts: { id: string; prenom: string; formation: string }[]) => {
      if (contacts.length === 0) throw new Error("Aucun contact");

      // Create single PDF with multiple A6 pages
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [105, 148],
      });

      contacts.forEach((contact, index) => {
        if (index > 0) {
          doc.addPage([105, 148], "portrait");
        }

        // Background
        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, 105, 148, "F");

        // Border
        doc.setDrawColor(59, 130, 246);
        doc.setLineWidth(2);
        doc.rect(5, 5, 95, 138, "S");

        // Logo placeholder
        doc.setFillColor(240, 240, 240);
        doc.rect(27.5, 15, 50, 25, "F");
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text("LOGO", 52.5, 30, { align: "center" });

        // Formation type badge
        doc.setFillColor(59, 130, 246);
        doc.roundedRect(17.5, 50, 70, 15, 3, 3, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text(`Formation ${contact.formation}`, 52.5, 60, { align: "center" });

        // Prénom
        doc.setTextColor(30, 30, 30);
        doc.setFontSize(24);
        doc.setFont("helvetica", "bold");
        doc.text(contact.prenom.toUpperCase(), 52.5, 95, { align: "center" });

        // Decorative line
        doc.setDrawColor(59, 130, 246);
        doc.setLineWidth(0.5);
        doc.line(25, 105, 80, 105);

        // "STAGIAIRE" label
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("STAGIAIRE", 52.5, 115, { align: "center" });
      });

      // Download the combined PDF
      const pdfBlob = doc.output("blob");
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Chevalets_Session_${contacts.length}_stagiaires.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      return contacts.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["chevalets"] });
      toast.success(`${count} chevalet(s) généré(s) dans un seul PDF`);
    },
    onError: (error) => {
      toast.error("Erreur lors de la génération des chevalets");
      console.error(error);
    },
  });
}
