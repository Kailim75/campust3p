import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type PedagogicalDocumentType = "inscription" | "entree_sortie" | "test_positionnement" | "attestation" | "autre";
export type DocumentStatus = "actif" | "archive";

export interface PedagogicalDocument {
  id: string;
  contact_id: string;
  session_id: string | null;
  document_type: PedagogicalDocumentType;
  file_path: string;
  file_name: string;
  version: number;
  status: DocumentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface PedagogicalDocumentInsert {
  contact_id: string;
  session_id?: string | null;
  document_type: PedagogicalDocumentType;
  file_path: string;
  file_name: string;
  notes?: string | null;
}

export function usePedagogicalDocuments(contactId: string) {
  return useQuery({
    queryKey: ["pedagogical-documents", contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pedagogical_documents")
        .select("*")
        .eq("contact_id", contactId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as PedagogicalDocument[];
    },
    enabled: !!contactId,
  });
}

export function usePedagogicalDocumentsBySession(sessionId: string) {
  return useQuery({
    queryKey: ["pedagogical-documents", "session", sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pedagogical_documents")
        .select(`
          *,
          contact:contacts(id, nom, prenom)
        `)
        .eq("session_id", sessionId)
        .eq("status", "actif")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!sessionId,
  });
}

export function useUploadPedagogicalDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      contactId,
      sessionId,
      documentType,
      file,
      notes,
    }: {
      contactId: string;
      sessionId?: string;
      documentType: PedagogicalDocumentType;
      file: File;
      notes?: string;
    }) => {
      // Upload file to storage
      const filePath = `${contactId}/${documentType}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("pedagogie")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Create document record
      const { data, error } = await supabase
        .from("pedagogical_documents")
        .insert({
          contact_id: contactId,
          session_id: sessionId || null,
          document_type: documentType,
          file_path: filePath,
          file_name: file.name,
          notes,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["pedagogical-documents", variables.contactId] });
      if (variables.sessionId) {
        queryClient.invalidateQueries({ queryKey: ["pedagogical-documents", "session", variables.sessionId] });
      }
      toast.success("Document pédagogique uploadé");
    },
    onError: (error) => {
      toast.error("Erreur lors de l'upload du document");
      console.error(error);
    },
  });
}

export function useDeletePedagogicalDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, contactId, filePath }: { id: string; contactId: string; filePath: string }) => {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("pedagogie")
        .remove([filePath]);

      if (storageError) console.error("Storage delete error:", storageError);

      // Delete record
      const { error } = await supabase
        .from("pedagogical_documents")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return contactId;
    },
    onSuccess: (contactId) => {
      queryClient.invalidateQueries({ queryKey: ["pedagogical-documents", contactId] });
      toast.success("Document supprimé");
    },
    onError: (error) => {
      toast.error("Erreur lors de la suppression");
      console.error(error);
    },
  });
}

export function useDownloadPedagogicalDocument() {
  return useMutation({
    mutationFn: async ({ filePath, fileName }: { filePath: string; fileName: string }) => {
      const { data, error } = await supabase.storage
        .from("pedagogie")
        .download(filePath);

      if (error) throw error;

      // Trigger download
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    onError: (error) => {
      toast.error("Erreur lors du téléchargement");
      console.error(error);
    },
  });
}

export const DOCUMENT_TYPE_LABELS: Record<PedagogicalDocumentType, string> = {
  inscription: "Fiche d'inscription",
  entree_sortie: "Fiche entrée/sortie",
  test_positionnement: "Test de positionnement",
  attestation: "Attestation",
  autre: "Autre document",
};

// ── Batch Generation (consolidated from useBatchPedagogicalDocuments) ──

import jsPDF from "jspdf";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface BatchContact {
  id: string;
  nom: string;
  prenom: string;
  email?: string | null;
  telephone?: string | null;
  date_naissance?: string | null;
  ville_naissance?: string | null;
}

interface BatchSessionInfo {
  id: string;
  nom: string;
  formation_type: string;
  date_debut: string;
  date_fin: string;
  lieu?: string | null;
}

type BatchDocumentType = "entree_sortie" | "test_positionnement";

export function useBatchPedagogicalDocuments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      contacts,
      session,
      documentType,
    }: {
      contacts: BatchContact[];
      session: BatchSessionInfo;
      documentType: BatchDocumentType;
    }) => {
      if (contacts.length === 0) throw new Error("Aucun contact");

      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      const documentTitle = documentType === "entree_sortie"
        ? "FICHE D'ENTRÉE / SORTIE DE FORMATION"
        : "TEST DE POSITIONNEMENT";

      contacts.forEach((contact, index) => {
        if (index > 0) doc.addPage();

        const pageWidth = doc.internal.pageSize.getWidth();
        let yPos = 20;

        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text(documentTitle, pageWidth / 2, yPos, { align: "center" });
        yPos += 15;

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

        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("INFORMATIONS STAGIAIRE", 20, yPos);
        yPos += 10;

        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.text(`Nom : ${contact.nom}`, 20, yPos); yPos += 7;
        doc.text(`Prénom : ${contact.prenom}`, 20, yPos); yPos += 7;
        if (contact.date_naissance) {
          doc.text(`Date de naissance : ${format(new Date(contact.date_naissance), "dd/MM/yyyy", { locale: fr })}`, 20, yPos);
          yPos += 7;
        }
        if (contact.ville_naissance) { doc.text(`Lieu de naissance : ${contact.ville_naissance}`, 20, yPos); yPos += 7; }
        if (contact.email) { doc.text(`Email : ${contact.email}`, 20, yPos); yPos += 7; }
        if (contact.telephone) { doc.text(`Téléphone : ${contact.telephone}`, 20, yPos); yPos += 7; }

        yPos += 15;

        if (documentType === "entree_sortie") {
          doc.setFont("helvetica", "bold");
          doc.text("ENTRÉE EN FORMATION", 20, yPos); yPos += 10;
          doc.setFont("helvetica", "normal");
          doc.text("Date d'entrée : _______________", 20, yPos); yPos += 7;
          doc.text("Heure d'arrivée : _______________", 20, yPos); yPos += 7;
          doc.text("Signature stagiaire :", 20, yPos); yPos += 25;
          doc.setFont("helvetica", "bold");
          doc.text("SORTIE DE FORMATION", 20, yPos); yPos += 10;
          doc.setFont("helvetica", "normal");
          doc.text("Date de sortie : _______________", 20, yPos); yPos += 7;
          doc.text("Heure de départ : _______________", 20, yPos); yPos += 7;
          doc.text("Observations : _______________________________________________", 20, yPos); yPos += 15;
          doc.text("Signature stagiaire :", 20, yPos); yPos += 25;
          doc.text("Signature formateur :", 120, yPos - 25);
        } else {
          doc.setFont("helvetica", "bold");
          doc.text("ÉVALUATION DES CONNAISSANCES PRÉALABLES", 20, yPos); yPos += 15;
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
          questions.forEach((q) => { doc.text(q, 20, yPos); yPos += 8; });
          yPos += 15;
          doc.text(`Fait le : ${format(new Date(), "dd/MM/yyyy", { locale: fr })}`, 20, yPos); yPos += 15;
          doc.text("Signature stagiaire :", 20, yPos);
          doc.text("Signature formateur :", 120, yPos);
        }
      });

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
