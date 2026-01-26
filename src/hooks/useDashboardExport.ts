import { useCallback } from "react";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useDynamicContactStats, useDynamicFinanceStats } from "./useDashboardDynamicStats";
import { useSessions } from "./useSessions";
import { useContacts } from "./useContacts";
import { toast } from "sonner";

export function useDashboardExport() {
  const { data: contactStats } = useDynamicContactStats();
  const { data: financeStats } = useDynamicFinanceStats();
  const { data: sessions } = useSessions();
  const { data: contacts } = useContacts();

  const exportDashboardToExcel = useCallback(() => {
    try {
      const workbook = XLSX.utils.book_new();
      const exportDate = format(new Date(), "dd/MM/yyyy HH:mm", { locale: fr });

      // === Sheet 1: KPIs principaux ===
      const kpisData = [
        ["Tableau de bord - Export du " + exportDate],
        [],
        ["INDICATEURS CLÉS"],
        ["Métrique", "Valeur", "Évolution"],
        ["Contacts total", contactStats?.total ?? 0, contactStats?.totalChange ? `${contactStats.totalChange > 0 ? "+" : ""}${contactStats.totalChange}%` : "-"],
        ["Clients actifs", contactStats?.clients ?? 0, contactStats?.clientsChange ? `${contactStats.clientsChange > 0 ? "+" : ""}${contactStats.clientsChange}%` : "-"],
        ["En attente", contactStats?.enAttente ?? 0, contactStats?.enAttenteChange ? `${contactStats.enAttenteChange > 0 ? "+" : ""}${contactStats.enAttenteChange}%` : "-"],
        ["CA émis (€)", financeStats?.caThisPeriod ?? 0, financeStats?.caChange ? `${financeStats.caChange > 0 ? "+" : ""}${financeStats.caChange}%` : "-"],
        ["CA total période (€)", financeStats?.caThisPeriod ?? 0, "-"],
      ];
      const wsKpis = XLSX.utils.aoa_to_sheet(kpisData);
      
      // Set column widths
      wsKpis["!cols"] = [{ wch: 30 }, { wch: 15 }, { wch: 15 }];
      
      XLSX.utils.book_append_sheet(workbook, wsKpis, "KPIs");

      // === Sheet 2: Sessions ===
      if (sessions && sessions.length > 0) {
        const sessionsHeader = [
          "Nom", "Type formation", "Statut", "Date début", "Date fin", 
          "Places totales", "Formateur", "Lieu"
        ];
        
        const sessionsRows = sessions.map(s => [
          s.nom,
          s.formation_type || "-",
          s.statut || "-",
          s.date_debut ? format(new Date(s.date_debut), "dd/MM/yyyy", { locale: fr }) : "-",
          s.date_fin ? format(new Date(s.date_fin), "dd/MM/yyyy", { locale: fr }) : "-",
          s.places_totales || 0,
          s.formateur || "-",
          s.adresse_ville || s.lieu || "-",
        ]);

        const sessionsData = [
          ["SESSIONS DE FORMATION"],
          sessionsHeader,
          ...sessionsRows,
        ];
        
        const wsSessions = XLSX.utils.aoa_to_sheet(sessionsData);
        wsSessions["!cols"] = [
          { wch: 30 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, 
          { wch: 12 }, { wch: 12 }, { wch: 20 }, { wch: 20 }
        ];
        XLSX.utils.book_append_sheet(workbook, wsSessions, "Sessions");
      }

      // === Sheet 3: Contacts récents ===
      if (contacts && contacts.length > 0) {
        const contactsHeader = [
          "Nom", "Prénom", "Email", "Téléphone", "Formation", "Statut", "Date création"
        ];
        
        // Get last 100 contacts
        const recentContacts = [...contacts]
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 100);

        const contactsRows = recentContacts.map(c => [
          c.nom,
          c.prenom,
          c.email || "-",
          c.telephone || "-",
          c.formation || "-",
          c.statut || "-",
          format(new Date(c.created_at), "dd/MM/yyyy", { locale: fr }),
        ]);

        const contactsData = [
          ["CONTACTS RÉCENTS (100 derniers)"],
          contactsHeader,
          ...contactsRows,
        ];
        
        const wsContacts = XLSX.utils.aoa_to_sheet(contactsData);
        wsContacts["!cols"] = [
          { wch: 20 }, { wch: 20 }, { wch: 30 }, { wch: 15 }, 
          { wch: 15 }, { wch: 15 }, { wch: 12 }
        ];
        XLSX.utils.book_append_sheet(workbook, wsContacts, "Contacts");
      }

      // === Sheet 4: Répartition par formation ===
      if (contacts && contacts.length > 0) {
        const formationCounts: Record<string, number> = {};
        contacts.forEach(c => {
          const formation = c.formation || "Non défini";
          formationCounts[formation] = (formationCounts[formation] || 0) + 1;
        });

        const formationData = [
          ["RÉPARTITION PAR FORMATION"],
          ["Formation", "Nombre de contacts", "Pourcentage"],
          ...Object.entries(formationCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([formation, count]) => [
              formation,
              count,
              `${Math.round((count / contacts.length) * 100)}%`
            ])
        ];

        const wsFormation = XLSX.utils.aoa_to_sheet(formationData);
        wsFormation["!cols"] = [{ wch: 25 }, { wch: 20 }, { wch: 15 }];
        XLSX.utils.book_append_sheet(workbook, wsFormation, "Formations");
      }

      // Generate file
      const fileName = `dashboard_export_${format(new Date(), "yyyy-MM-dd_HHmm")}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      
      toast.success("Export Excel généré avec succès");
    } catch (error) {
      console.error("Error exporting dashboard:", error);
      toast.error("Erreur lors de l'export Excel");
    }
  }, [contactStats, financeStats, sessions, contacts]);

  return { exportDashboardToExcel };
}
