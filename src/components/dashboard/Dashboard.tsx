import { Header } from "@/components/layout/Header";
import { StatCard } from "./StatCard";
import { AlertCard } from "./AlertCard";
import { SessionsOverview } from "./SessionsOverview";
import { RecentContacts } from "./RecentContacts";
import { Users, GraduationCap, TrendingUp, Euro } from "lucide-react";
import { useContactsStats } from "@/hooks/useContacts";

// Mock data for alerts (to be connected to DB later)
const alerts = [
  { id: "1", type: "document" as const, title: "Document expiré", description: "Permis de Jean Dupont expire dans 3 jours", date: "Aujourd'hui" },
  { id: "2", type: "payment" as const, title: "Paiement en retard", description: "Marie Martin - Solde de 450€ impayé", date: "Hier" },
  { id: "3", type: "session" as const, title: "Places limitées", description: "Session VTC du 20/01 - 1 place restante", date: "Il y a 2j" },
];

export function Dashboard() {
  const { data: contactStats, isLoading } = useContactsStats();

  const stats = [
    { 
      title: "Contacts total", 
      value: isLoading ? "..." : contactStats?.total ?? 0, 
      change: 0, 
      changeLabel: "ce mois", 
      icon: Users, 
      variant: "info" as const 
    },
    { 
      title: "Clients actifs", 
      value: isLoading ? "..." : contactStats?.clients ?? 0, 
      change: 0, 
      changeLabel: "ce mois", 
      icon: GraduationCap, 
      variant: "success" as const 
    },
    { 
      title: "En attente", 
      value: isLoading ? "..." : contactStats?.enAttente ?? 0, 
      change: 0, 
      changeLabel: "à traiter", 
      icon: TrendingUp, 
      variant: "primary" as const 
    },
    { 
      title: "Validés (Bravo)", 
      value: isLoading ? "..." : contactStats?.bravo ?? 0, 
      change: 0, 
      changeLabel: "formations terminées", 
      icon: Euro, 
      variant: "warning" as const 
    },
  ];

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
            <SessionsOverview />
          </div>

          {/* Alerts */}
          <div>
            <AlertCard alerts={alerts} />
          </div>
        </div>

        {/* Recent Contacts - Now connected to DB */}
        <div className="grid grid-cols-1">
          <RecentContacts />
        </div>
      </main>
    </div>
  );
}
