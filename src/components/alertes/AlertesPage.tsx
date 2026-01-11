import { Header } from "@/components/layout/Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  AlertTriangle, 
  FileWarning, 
  Clock, 
  CreditCard,
  CheckCircle,
  XCircle,
  Bell
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Alerte {
  id: string;
  type: "document" | "payment" | "session" | "urgent";
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  date: string;
  action?: string;
}

const alertes: Alerte[] = [
  { id: "1", type: "document", priority: "high", title: "Permis expiré", description: "Le permis de Jean Dupont a expiré le 05/01/2026", date: "Il y a 5 jours", action: "Contacter le stagiaire" },
  { id: "2", type: "payment", priority: "high", title: "Paiement en retard", description: "Pierre Bernard - 350€ impayés depuis 10 jours", date: "Il y a 10 jours", action: "Envoyer relance" },
  { id: "3", type: "session", priority: "medium", title: "Session presque complète", description: "Formation VTC du 20/01 - 1 place restante", date: "Il y a 2 jours", action: "Voir session" },
  { id: "4", type: "document", priority: "medium", title: "Document manquant", description: "Certificat médical manquant pour Marie Martin", date: "Il y a 3 jours", action: "Demander document" },
  { id: "5", type: "session", priority: "low", title: "Rappel formation", description: "Formation Continue Taxi démarre dans 5 jours", date: "Aujourd'hui", action: "Envoyer convocations" },
  { id: "6", type: "document", priority: "medium", title: "Casier à vérifier", description: "Casier judiciaire de Marie Martin en attente de vérification", date: "Il y a 2 jours", action: "Vérifier document" },
];

const typeConfig = {
  document: { icon: FileWarning, label: "Document", color: "text-warning" },
  payment: { icon: CreditCard, label: "Paiement", color: "text-destructive" },
  session: { icon: Clock, label: "Session", color: "text-info" },
  urgent: { icon: AlertTriangle, label: "Urgent", color: "text-destructive" },
};

const priorityConfig = {
  high: { label: "Haute", class: "bg-destructive/10 text-destructive border-destructive/20" },
  medium: { label: "Moyenne", class: "bg-warning/10 text-warning border-warning/20" },
  low: { label: "Basse", class: "bg-info/10 text-info border-info/20" },
};

export function AlertesPage() {
  const stats = {
    total: alertes.length,
    high: alertes.filter((a) => a.priority === "high").length,
    medium: alertes.filter((a) => a.priority === "medium").length,
    low: alertes.filter((a) => a.priority === "low").length,
  };

  return (
    <div className="min-h-screen">
      <Header 
        title="Centre d'alertes" 
        subtitle="Suivez les tâches urgentes et rappels"
      />

      <main className="p-6 animate-fade-in">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="card-elevated p-4">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total alertes</p>
                <p className="text-2xl font-display font-bold text-foreground">{stats.total}</p>
              </div>
            </div>
          </div>
          <div className="card-elevated p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div>
                <p className="text-sm text-muted-foreground">Priorité haute</p>
                <p className="text-2xl font-display font-bold text-destructive">{stats.high}</p>
              </div>
            </div>
          </div>
          <div className="card-elevated p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-warning" />
              <div>
                <p className="text-sm text-muted-foreground">Priorité moyenne</p>
                <p className="text-2xl font-display font-bold text-warning">{stats.medium}</p>
              </div>
            </div>
          </div>
          <div className="card-elevated p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-info" />
              <div>
                <p className="text-sm text-muted-foreground">Priorité basse</p>
                <p className="text-2xl font-display font-bold text-info">{stats.low}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Alerts List */}
        <div className="space-y-3">
          {alertes.map((alerte) => {
            const TypeIcon = typeConfig[alerte.type].icon;
            
            return (
              <div
                key={alerte.id}
                className={cn(
                  "card-elevated p-4 border-l-4 transition-all hover:shadow-lg",
                  alerte.priority === "high" && "border-l-destructive",
                  alerte.priority === "medium" && "border-l-warning",
                  alerte.priority === "low" && "border-l-info"
                )}
              >
                <div className="flex items-start gap-4">
                  <div className={cn("mt-0.5", typeConfig[alerte.type].color)}>
                    <TypeIcon className="h-5 w-5" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-foreground">
                        {alerte.title}
                      </h4>
                      <Badge
                        variant="outline"
                        className={cn("text-xs", priorityConfig[alerte.priority].class)}
                      >
                        {priorityConfig[alerte.priority].label}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {typeConfig[alerte.type].label}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {alerte.description}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {alerte.date}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {alerte.action && (
                      <Button size="sm" variant="secondary">
                        {alerte.action}
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" className="h-8 w-8">
                      <CheckCircle className="h-4 w-4 text-success" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8">
                      <XCircle className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
