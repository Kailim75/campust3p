import { useCallback } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
// XLSX loaded dynamically for performance
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export interface ExportConfig {
  filename: string;
  sheetName?: string;
}

export function useExportData() {
  // Export contacts
  const exportContacts = useCallback(async (config: ExportConfig = { filename: "contacts" }) => {
    try {
      const { data: contacts, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("archived", false)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const exportData = contacts.map((c) => ({
        "ID": c.custom_id || "",
        "Civilité": c.civilite || "",
        "Prénom": c.prenom,
        "Nom": c.nom,
        "Email": c.email || "",
        "Téléphone": c.telephone || "",
        "Date de naissance": c.date_naissance ? format(new Date(c.date_naissance), "dd/MM/yyyy") : "",
        "Rue": c.rue || "",
        "Code postal": c.code_postal || "",
        "Ville": c.ville || "",
        "Formation": c.formation || "",
        "Statut": c.statut || "",
        "Source": c.source || "",
        "N° Permis": c.numero_permis || "",
        "N° Carte Pro": c.numero_carte_professionnelle || "",
        "Date création": format(new Date(c.created_at), "dd/MM/yyyy HH:mm"),
        "Commentaires": c.commentaires || "",
      }));

      exportToExcel(exportData, config);
      toast.success(`${contacts.length} contacts exportés`);
    } catch (error: any) {
      console.error("Export error:", error);
      toast.error("Erreur lors de l'export");
    }
  }, []);

  // Export contacts with filters
  const exportFilteredContacts = useCallback(async (
    contacts: any[],
    config: ExportConfig = { filename: "contacts" }
  ) => {
    try {
      const exportData = contacts.map((c) => ({
        "ID": c.custom_id || "",
        "Civilité": c.civilite || "",
        "Prénom": c.prenom,
        "Nom": c.nom,
        "Email": c.email || "",
        "Téléphone": c.telephone || "",
        "Date de naissance": c.date_naissance ? format(new Date(c.date_naissance), "dd/MM/yyyy") : "",
        "Rue": c.rue || "",
        "Code postal": c.code_postal || "",
        "Ville": c.ville || "",
        "Formation": c.formation || "",
        "Statut": c.statut || "",
        "Source": c.source || "",
        "N° Permis": c.numero_permis || "",
        "N° Carte Pro": c.numero_carte_professionnelle || "",
        "Date création": format(new Date(c.created_at), "dd/MM/yyyy HH:mm"),
        "Commentaires": c.commentaires || "",
      }));

      exportToExcel(exportData, config);
      toast.success(`${contacts.length} contacts exportés`);
    } catch (error: any) {
      console.error("Export error:", error);
      toast.error("Erreur lors de l'export");
    }
  }, []);

  // Export session attendees (émargement)
  const exportSessionEmargement = useCallback(async (
    sessionId: string,
    sessionName: string,
    config: ExportConfig = { filename: "emargement" }
  ) => {
    try {
      const { data: emargements, error } = await supabase
        .from("emargements")
        .select(`
          *,
          contact:contacts(nom, prenom, email, telephone)
        `)
        .eq("session_id", sessionId)
        .order("date_emargement", { ascending: true });

      if (error) throw error;

      const exportData = emargements.map((e) => {
        const contact = e.contact as any;
        return {
          "Date": format(new Date(e.date_emargement), "dd/MM/yyyy", { locale: fr }),
          "Période": e.periode === "matin" ? "Matin" : "Après-midi",
          "Heure début": e.heure_debut || "",
          "Heure fin": e.heure_fin || "",
          "Prénom": contact?.prenom || "",
          "Nom": contact?.nom || "",
          "Email": contact?.email || "",
          "Téléphone": contact?.telephone || "",
          "Présent": e.present ? "Oui" : "Non",
          "Signé": e.signature_url ? "Oui" : "Non",
          "Date signature": e.date_signature ? format(new Date(e.date_signature), "dd/MM/yyyy HH:mm") : "",
          "Commentaires": e.commentaires || "",
        };
      });

      const customConfig = {
        ...config,
        filename: `emargement_${sessionName.replace(/\s+/g, "_")}_${format(new Date(), "yyyy-MM-dd")}`,
        sheetName: "Émargement",
      };

      exportToExcel(exportData, customConfig);
      toast.success(`${emargements.length} émargements exportés`);
    } catch (error: any) {
      console.error("Export error:", error);
      toast.error("Erreur lors de l'export");
    }
  }, []);

  // Export all sessions with inscriptions
  const exportSessionsWithInscriptions = useCallback(async (
    config: ExportConfig = { filename: "sessions" }
  ) => {
    try {
      const { data: sessions, error } = await supabase
        .from("sessions")
        .select(`
          *,
          session_inscriptions(
            id,
            statut,
            contact:contacts(nom, prenom, email, telephone)
          )
        `)
        .order("date_debut", { ascending: false });

      if (error) throw error;

      const exportData: any[] = [];
      
      sessions.forEach((session) => {
        const inscriptions = session.session_inscriptions as any[];
        if (inscriptions && inscriptions.length > 0) {
          inscriptions.forEach((inscription) => {
            const contact = inscription.contact as any;
            exportData.push({
              "Session": session.nom,
              "N° Session": session.numero_session || "",
              "Type formation": session.formation_type,
              "Date début": format(new Date(session.date_debut), "dd/MM/yyyy"),
              "Date fin": format(new Date(session.date_fin), "dd/MM/yyyy"),
              "Lieu": session.lieu || "",
              "Prénom stagiaire": contact?.prenom || "",
              "Nom stagiaire": contact?.nom || "",
              "Email stagiaire": contact?.email || "",
              "Téléphone stagiaire": contact?.telephone || "",
              "Statut inscription": inscription.statut,
              "Statut session": session.statut,
            });
          });
        } else {
          exportData.push({
            "Session": session.nom,
            "N° Session": session.numero_session || "",
            "Type formation": session.formation_type,
            "Date début": format(new Date(session.date_debut), "dd/MM/yyyy"),
            "Date fin": format(new Date(session.date_fin), "dd/MM/yyyy"),
            "Lieu": session.lieu || "",
            "Prénom stagiaire": "",
            "Nom stagiaire": "",
            "Email stagiaire": "",
            "Téléphone stagiaire": "",
            "Statut inscription": "",
            "Statut session": session.statut,
          });
        }
      });

      exportToExcel(exportData, config);
      toast.success(`${sessions.length} sessions exportées`);
    } catch (error: any) {
      console.error("Export error:", error);
      toast.error("Erreur lors de l'export");
    }
  }, []);

  // Export examens T3P
  const exportExamensT3P = useCallback(async (
    config: ExportConfig = { filename: "examens_t3p" }
  ) => {
    try {
      const { data: examens, error } = await supabase
        .from("examens_t3p")
        .select(`
          *,
          contact:contacts(nom, prenom, email)
        `)
        .order("date_examen", { ascending: false });

      if (error) throw error;

      const exportData = examens.map((e) => {
        const contact = e.contact as any;
        return {
          "Prénom": contact?.prenom || "",
          "Nom": contact?.nom || "",
          "Email": contact?.email || "",
          "Type formation": e.type_formation,
          "Date examen": format(new Date(e.date_examen), "dd/MM/yyyy"),
          "Heure": e.heure_examen || "",
          "Centre": e.centre_examen || "",
          "Département": e.departement || "",
          "Statut": e.statut,
          "Résultat": e.resultat || "",
          "Score": e.score || "",
          "N° Tentative": e.numero_tentative,
          "Date réussite": e.date_reussite ? format(new Date(e.date_reussite), "dd/MM/yyyy") : "",
          "Date expiration": e.date_expiration ? format(new Date(e.date_expiration), "dd/MM/yyyy") : "",
        };
      });

      exportToExcel(exportData, config);
      toast.success(`${examens.length} examens T3P exportés`);
    } catch (error: any) {
      console.error("Export error:", error);
      toast.error("Erreur lors de l'export");
    }
  }, []);

  return {
    exportContacts,
    exportFilteredContacts,
    exportSessionEmargement,
    exportSessionsWithInscriptions,
    exportExamensT3P,
  };
}

// Helper function to export data to Excel
async function exportToExcel(data: any[], config: ExportConfig) {
  if (data.length === 0) {
    toast.error("Aucune donnée à exporter");
    return;
  }

  const XLSX = await import("xlsx");
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, config.sheetName || "Données");

  // Auto-size columns
  const maxWidths = Object.keys(data[0]).map((key) => {
    const maxLen = Math.max(
      key.length,
      ...data.map((row) => String(row[key] || "").length)
    );
    return { wch: Math.min(maxLen + 2, 50) };
  });
  worksheet["!cols"] = maxWidths;

  XLSX.writeFile(workbook, `${config.filename}_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
}

// Export to CSV helper
export function exportToCSV(data: any[], filename: string) {
  if (data.length === 0) {
    toast.error("Aucune donnée à exporter");
    return;
  }

  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(";"),
    ...data.map(row => 
      headers.map(h => {
        const value = String(row[h] || "");
        if (value.includes(";") || value.includes('"') || value.includes("\n")) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(";")
    )
  ];
  
  const csvContent = "\uFEFF" + csvRows.join("\n"); // BOM for Excel UTF-8
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}_${format(new Date(), "yyyy-MM-dd")}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
