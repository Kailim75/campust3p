import { Header } from "@/components/layout/Header";
import { StatCard } from "./StatCard";
import { AlertCard } from "./AlertCard";
import { SessionsOverview } from "./SessionsOverview";
import { RecentContacts } from "./RecentContacts";
import { Users, GraduationCap, TrendingUp, Euro } from "lucide-react";

// Mock data
const stats = [
  { title: "Prospects actifs", value: 47, change: 12, changeLabel: "ce mois", icon: Users, variant: "info" as const },
  { title: "Stagiaires en cours", value: 23, change: 8, changeLabel: "ce mois", icon: GraduationCap, variant: "success" as const },
  { title: "Taux de conversion", value: "68%", change: 5, changeLabel: "vs mois dernier", icon: TrendingUp, variant: "primary" as const },
  { title: "CA mensuel", value: "24 850€", change: -3, changeLabel: "vs mois dernier", icon: Euro, variant: "warning" as const },
];

const alerts = [
  { id: "1", type: "document" as const, title: "Document expiré", description: "Permis de Jean Dupont expire dans 3 jours", date: "Aujourd'hui" },
  { id: "2", type: "payment" as const, title: "Paiement en retard", description: "Marie Martin - Solde de 450€ impayé", date: "Hier" },
  { id: "3", type: "session" as const, title: "Places limitées", description: "Session VTC du 20/01 - 1 place restante", date: "Il y a 2j" },
];

const sessions = [
  { id: "1", formation: "Formation Initiale Taxi", type: "Taxi" as const, dateDebut: "15/01/2026", dateFin: "12/02/2026", inscrits: 8, places: 10, status: "a_venir" as const },
  { id: "2", formation: "Formation VTC", type: "VTC" as const, dateDebut: "20/01/2026", dateFin: "17/02/2026", inscrits: 10, places: 10, status: "complet" as const },
  { id: "3", formation: "Formation Continue Taxi", type: "Continue" as const, dateDebut: "05/02/2026", dateFin: "07/02/2026", inscrits: 6, places: 12, status: "a_venir" as const },
  { id: "4", formation: "Formation Mobilité", type: "Mobilité" as const, dateDebut: "10/02/2026", dateFin: "12/02/2026", inscrits: 4, places: 8, status: "a_venir" as const },
];

const recentContacts = [
  { id: "1", nom: "Dupont", prenom: "Jean", email: "jean.dupont@email.com", telephone: "06 12 34 56 78", status: "prospect" as const, formation: "Formation Taxi", dateContact: "Aujourd'hui" },
  { id: "2", nom: "Martin", prenom: "Marie", email: "marie.martin@email.com", telephone: "06 98 76 54 32", status: "inscrit" as const, formation: "Formation VTC", dateContact: "Hier" },
  { id: "3", nom: "Bernard", prenom: "Pierre", email: "pierre.bernard@email.com", telephone: "06 11 22 33 44", status: "stagiaire" as const, formation: "Formation Continue", dateContact: "Il y a 2j" },
  { id: "4", nom: "Petit", prenom: "Sophie", email: "sophie.petit@email.com", telephone: "06 55 66 77 88", status: "ancien" as const, formation: "Formation VMDTR", dateContact: "Il y a 3j" },
];

export function Dashboard() {
  return (
    <div className="min-h-screen">
      <Header 
        title="Tableau de bord" 
        subtitle="Vue d'ensemble de votre activité"
      />

      <main className="p-6 space-y-6 animate-fade-in">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <StatCard key={stat.title} {...stat} />
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sessions Overview - Takes 2 columns */}
          <div className="lg:col-span-2">
            <SessionsOverview sessions={sessions} />
          </div>

          {/* Alerts */}
          <div>
            <AlertCard alerts={alerts} />
          </div>
        </div>

        {/* Recent Contacts */}
        <div className="grid grid-cols-1">
          <RecentContacts contacts={recentContacts} />
        </div>
      </main>
    </div>
  );
}
