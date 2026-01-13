import { Header } from "@/components/layout/Header";
import { StatCard } from "./StatCard";
import { AlertCard } from "./AlertCard";
import { SessionsOverview } from "./SessionsOverview";
import { RecentContacts } from "./RecentContacts";
import { Users, GraduationCap, TrendingUp, Euro } from "lucide-react";
import { useContactsStats } from "@/hooks/useContacts";

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

          {/* Alerts - Now connected to real data */}
          <div>
            <AlertCard />
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
