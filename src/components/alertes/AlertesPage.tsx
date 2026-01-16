import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  AlertTriangle, 
  CreditCard,
  Clock, 
  Calendar,
  CheckCircle,
  Bell,
  Car,
  User,
  FileText,
  Award,
  Eye,
  Send,
  Filter,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAllAlerts, type Alert } from "@/hooks/useAlerts";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const typeConfig: Record<string, { icon: any; label: string; color: string }> = {
  carte_pro: { icon: CreditCard, label: "Carte Pro", color: "text-warning" },
  permis: { icon: Car, label: "Permis", color: "text-info" },
  session: { icon: Calendar, label: "Session", color: "text-primary" },
  document: { icon: FileText, label: "Document", color: "text-muted-foreground" },
  payment: { icon: CreditCard, label: "Paiement", color: "text-destructive" },
  exam_t3p: { icon: Award, label: "Examen T3P", color: "text-success" },
  exam_pratique: { icon: Car, label: "Examen Pratique", color: "text-info" },
};

const priorityConfig = {
  high: { label: "Haute", class: "bg-destructive/10 text-destructive border-destructive/20" },
  medium: { label: "Moyenne", class: "bg-warning/10 text-warning border-warning/20" },
  low: { label: "Basse", class: "bg-info/10 text-info border-info/20" },
};

export function AlertesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { data: alerts, isLoading, counts } = useAllAlerts();
  
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  // Filter alerts based on selected filters
  const filteredAlerts = alerts.filter((alert) => {
    if (typeFilter !== "all" && alert.type !== typeFilter) return false;
    if (priorityFilter !== "all" && alert.priority !== priorityFilter) return false;
    return true;
  });

  const stats = {
    total: alerts.length,
    high: alerts.filter((a) => a.priority === "high").length,
    medium: alerts.filter((a) => a.priority === "medium").length,
    low: alerts.filter((a) => a.priority === "low").length,
  };

  // Handle quick action buttons
  const handleAction = (alert: Alert) => {
    switch (alert.actionType) {
      case "view_contact":
        if (alert.contactId) {
          navigate(`/?section=contacts&id=${alert.contactId}`);
        }
        break;
      case "view_session":
        if (alert.sessionId) {
          navigate(`/?section=sessions&id=${alert.sessionId}`);
        }
        break;
      case "view_facture":
        if (alert.factureId) {
          navigate(`/?section=paiements&factureId=${alert.factureId}`);
        }
        break;
      case "view_exam":
        if (alert.contactId) {
          navigate(`/?section=contacts&id=${alert.contactId}&tab=examens`);
        }
        break;
      case "send_reminder":
        if (alert.contactId) {
          navigate(`/?section=contacts&id=${alert.contactId}&action=reminder`);
        }
        break;
      default:
        if (alert.contactId) {
          navigate(`/?section=contacts&id=${alert.contactId}`);
        }
    }
  };

  const getActionButton = (alert: Alert) => {
    switch (alert.actionType) {
      case "view_contact":
        return (
          <Button size="sm" variant="secondary" onClick={() => handleAction(alert)}>
            <User className="h-3 w-3 mr-1" />
            Contact
          </Button>
        );
      case "view_session":
        return (
          <Button size="sm" variant="secondary" onClick={() => handleAction(alert)}>
            <Calendar className="h-3 w-3 mr-1" />
            Session
          </Button>
        );
      case "view_facture":
        return (
          <Button size="sm" variant="secondary" onClick={() => handleAction(alert)}>
            <Eye className="h-3 w-3 mr-1" />
            Facture
          </Button>
        );
      case "view_exam":
        return (
          <Button size="sm" variant="secondary" onClick={() => handleAction(alert)}>
            <Award className="h-3 w-3 mr-1" />
            Examen
          </Button>
        );
      case "send_reminder":
        return (
          <Button size="sm" variant="outline" onClick={() => handleAction(alert)}>
            <Send className="h-3 w-3 mr-1" />
            Relancer
          </Button>
        );
      default:
        if (alert.contactId) {
          return (
            <Button size="sm" variant="ghost" onClick={() => handleAction(alert)}>
              <ExternalLink className="h-3 w-3 mr-1" />
              Voir
            </Button>
          );
        }
        return null;
    }
  };

  return (
    <div className="min-h-screen">
      <Header 
        title="Centre d'alertes" 
        subtitle="Suivez les tâches urgentes et rappels"
      />

      <main className="p-6 animate-fade-in">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="card-elevated p-4">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-display font-bold text-foreground">{stats.total}</p>
              </div>
            </div>
          </div>
          <div className="card-elevated p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div>
                <p className="text-sm text-muted-foreground">Urgentes</p>
                <p className="text-2xl font-display font-bold text-destructive">{stats.high}</p>
              </div>
            </div>
          </div>
          <div className="card-elevated p-4">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-success" />
              <div>
                <p className="text-sm text-muted-foreground">Examens</p>
                <p className="text-2xl font-display font-bold text-success">{counts.exams}</p>
              </div>
            </div>
          </div>
          <div className="card-elevated p-4">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-warning" />
              <div>
                <p className="text-sm text-muted-foreground">Paiements</p>
                <p className="text-2xl font-display font-bold text-warning">{counts.payments}</p>
              </div>
            </div>
          </div>
          <div className="card-elevated p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-info" />
              <div>
                <p className="text-sm text-muted-foreground">Sessions</p>
                <p className="text-2xl font-display font-bold text-info">{counts.sessions}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Filtres:</span>
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Type d'alerte" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              <SelectItem value="exam_t3p">Examen T3P</SelectItem>
              <SelectItem value="exam_pratique">Examen Pratique</SelectItem>
              <SelectItem value="session">Session</SelectItem>
              <SelectItem value="payment">Paiement</SelectItem>
              <SelectItem value="document">Document</SelectItem>
              <SelectItem value="carte_pro">Carte Pro</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Priorité" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes priorités</SelectItem>
              <SelectItem value="high">Haute</SelectItem>
              <SelectItem value="medium">Moyenne</SelectItem>
              <SelectItem value="low">Basse</SelectItem>
            </SelectContent>
          </Select>
          {(typeFilter !== "all" || priorityFilter !== "all") && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                setTypeFilter("all");
                setPriorityFilter("all");
              }}
            >
              Réinitialiser
            </Button>
          )}
        </div>

        {/* Alerts List */}
        <div className="space-y-3">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card-elevated p-4">
                <div className="flex items-start gap-4">
                  <Skeleton className="h-5 w-5 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-64" />
                  </div>
                </div>
              </div>
            ))
          ) : filteredAlerts.length === 0 ? (
            <div className="card-elevated p-12 text-center">
              <CheckCircle className="h-12 w-12 text-success mx-auto mb-4" />
              <h3 className="font-display font-semibold text-lg text-foreground mb-2">
                {typeFilter !== "all" || priorityFilter !== "all" 
                  ? "Aucune alerte correspondante"
                  : "Aucune alerte"}
              </h3>
              <p className="text-muted-foreground">
                {typeFilter !== "all" || priorityFilter !== "all"
                  ? "Modifiez vos filtres pour voir d'autres alertes"
                  : "Tout est à jour !"}
              </p>
            </div>
          ) : (
            filteredAlerts.map((alert) => {
              const config = typeConfig[alert.type] || { icon: Bell, label: "Alerte", color: "text-muted-foreground" };
              const TypeIcon = config.icon;
              
              return (
                <div
                  key={alert.id}
                  className={cn(
                    "card-elevated p-4 border-l-4 transition-all hover:shadow-lg",
                    alert.priority === "high" && "border-l-destructive",
                    alert.priority === "medium" && "border-l-warning",
                    alert.priority === "low" && "border-l-info"
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className={cn("mt-0.5", config.color)}>
                      <TypeIcon className="h-5 w-5" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className="font-medium text-foreground">
                          {alert.title}
                        </h4>
                        <Badge
                          variant="outline"
                          className={cn("text-xs", priorityConfig[alert.priority].class)}
                        >
                          {priorityConfig[alert.priority].label}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {config.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {alert.description}
                      </p>
                      {alert.expiryDate && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {alert.daysUntilExpiry < 0 
                            ? `Expiré le ${format(new Date(alert.expiryDate), 'dd MMMM yyyy', { locale: fr })}`
                            : `Le ${format(new Date(alert.expiryDate), 'dd MMMM yyyy', { locale: fr })}`
                          }
                        </p>
                      )}
                      {alert.contactName && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          {alert.contactName}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {getActionButton(alert)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Summary */}
        {filteredAlerts.length > 0 && (
          <div className="mt-6 text-sm text-muted-foreground text-center">
            {filteredAlerts.length} alerte{filteredAlerts.length > 1 ? 's' : ''} affichée{filteredAlerts.length > 1 ? 's' : ''}
            {(typeFilter !== "all" || priorityFilter !== "all") && ` (sur ${alerts.length} au total)`}
          </div>
        )}
      </main>
    </div>
  );
}