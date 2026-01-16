import { useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Session } from './useSessions';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const statusLabels: Record<string, string> = {
  a_venir: 'À venir',
  en_cours: 'En cours',
  terminee: 'Terminée',
  annulee: 'Annulée',
  complet: 'Complet',
};

export function useSessionsExport() {
  const exportSessions = (
    sessions: Session[],
    inscriptionsCounts: Record<string, number>,
    formatType: 'xlsx' | 'csv' = 'xlsx'
  ) => {
    const data = sessions.map((session) => ({
      'Numéro': session.numero_session || '-',
      'Nom': session.nom,
      'Type de formation': session.formation_type,
      'Date de début': format(new Date(session.date_debut), 'dd/MM/yyyy', { locale: fr }),
      'Date de fin': format(new Date(session.date_fin), 'dd/MM/yyyy', { locale: fr }),
      'Lieu': session.lieu || session.adresse_ville || '-',
      'Formateur': session.formateur || '-',
      'Places totales': session.places_totales,
      'Inscrits': inscriptionsCounts[session.id] || 0,
      'Taux de remplissage': `${Math.round(((inscriptionsCounts[session.id] || 0) / session.places_totales) * 100)}%`,
      'Prix HT': session.prix_ht ? `${session.prix_ht} €` : '-',
      'Statut': statusLabels[session.statut] || session.statut,
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sessions');

    // Set column widths
    worksheet['!cols'] = [
      { wch: 15 }, // Numéro
      { wch: 35 }, // Nom
      { wch: 20 }, // Type
      { wch: 12 }, // Date début
      { wch: 12 }, // Date fin
      { wch: 25 }, // Lieu
      { wch: 20 }, // Formateur
      { wch: 12 }, // Places
      { wch: 10 }, // Inscrits
      { wch: 18 }, // Taux
      { wch: 12 }, // Prix
      { wch: 12 }, // Statut
    ];

    const filename = `sessions_${format(new Date(), 'yyyy-MM-dd')}.${formatType}`;
    
    if (formatType === 'csv') {
      // Add BOM for UTF-8 CSV
      const csvContent = XLSX.utils.sheet_to_csv(worksheet);
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
    } else {
      XLSX.writeFile(workbook, filename);
    }
  };

  const exportSessionInscriptions = (
    sessionName: string,
    inscriptions: Array<{
      contact: { nom: string; prenom: string; email?: string; telephone?: string };
      date_inscription: string;
      statut: string;
    }>,
    formatType: 'xlsx' | 'csv' = 'xlsx'
  ) => {
    const data = inscriptions.map((inscription) => ({
      'Nom': inscription.contact.nom,
      'Prénom': inscription.contact.prenom,
      'Email': inscription.contact.email || '-',
      'Téléphone': inscription.contact.telephone || '-',
      'Date d\'inscription': format(new Date(inscription.date_inscription), 'dd/MM/yyyy', { locale: fr }),
      'Statut': inscription.statut,
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inscrits');

    const safeSessionName = sessionName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
    const filename = `inscrits_${safeSessionName}_${format(new Date(), 'yyyy-MM-dd')}.${formatType}`;

    if (formatType === 'csv') {
      const csvContent = XLSX.utils.sheet_to_csv(worksheet);
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
    } else {
      XLSX.writeFile(workbook, filename);
    }
  };

  return { exportSessions, exportSessionInscriptions };
}
