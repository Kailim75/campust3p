import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAllAlerts } from "@/hooks/useAlerts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Lightbulb, 
  FileText, 
  CreditCard, 
  Users, 
  Calendar,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SmartSuggestionsCardProps {
  onNavigate: (section: string) => void;
  onAction?: (action: string, data?: any) => void;
}

interface Suggestion {
  id: string;
  type: "action" | "insight" | "warning";
  icon: React.ElementType;
  title: string;
  description: string;
  actionLabel: string;
  section: string;
  priority: "high" | "medium" | "low";
  count?: number;
}

export function SmartSuggestionsCard({ onNavigate, onAction }: SmartSuggestionsCardProps) {
  const { data: alerts = [], isLoading: alertsLoading } = useAllAlerts();
  
  // Fetch incomplete contacts (missing documents, payments, etc.)
  const { data: incompleteData, isLoading: incompleteLoading } = useQuery({
    queryKey: ["smart-suggestions-incomplete"],
    queryFn: async () => {
      // Contacts without documents
      const { data: contactsWithDocs } = await supabase
        .from("contact_documents")
        .select("contact_id");
      
      const contactIdsWithDocs = new Set(contactsWithDocs?.map(d => d.contact_id) || []);
      
      const { data: allContacts } = await supabase
        .from("contacts")
        .select("id")
        .eq("archived", false)
        .in("statut", ["En formation théorique", "En formation pratique", "Client"]);
      
      const contactsWithoutDocs = allContacts?.filter(c => !contactIdsWithDocs.has(c.id)).length || 0;
      
      // Sessions without emargements
      const { data: sessionsEnCours } = await supabase
        .from("sessions")
        .select("id")
        .eq("statut", "en_cours");
      
      const sessionsCount = sessionsEnCours?.length || 0;
      
      // Unpaid invoices count
      const { data: unpaidInvoices } = await supabase
        .from("factures")
        .select("id")
        .in("statut", ["emise", "partiel", "impayee"]);
      
      const unpaidCount = unpaidInvoices?.length || 0;
      
      return {
        contactsWithoutDocs,
        sessionsEnCours: sessionsCount,
        unpaidInvoices: unpaidCount,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  const isLoading = alertsLoading || incompleteLoading;
  
  // Build smart suggestions based on data
  const suggestions: Suggestion[] = [];
  
  // Payment alerts
  const paymentAlerts = alerts.filter(a => a.type === "payment" && a.priority === "high");
  if (paymentAlerts.length > 0) {
    suggestions.push({
      id: "payments-overdue",
      type: "warning",
      icon: CreditCard,
      title: `${paymentAlerts.length} paiement${paymentAlerts.length > 1 ? 's' : ''} en retard`,
      description: "Relancez les factures impayées pour améliorer votre trésorerie",
      actionLabel: "Voir les factures",
      section: "paiements",
      priority: "high",
      count: paymentAlerts.length,
    });
  }
  
  // Documents missing
  if (incompleteData?.contactsWithoutDocs && incompleteData.contactsWithoutDocs > 0) {
    suggestions.push({
      id: "docs-missing",
      type: "action",
      icon: FileText,
      title: `${incompleteData.contactsWithoutDocs} stagiaire${incompleteData.contactsWithoutDocs > 1 ? 's' : ''} sans documents`,
      description: "Demandez les documents manquants pour compléter les dossiers",
      actionLabel: "Gérer les documents",
      section: "contacts",
      priority: "medium",
      count: incompleteData.contactsWithoutDocs,
    });
  }
  
  // Sessions in progress
  if (incompleteData?.sessionsEnCours && incompleteData.sessionsEnCours > 0) {
    suggestions.push({
      id: "sessions-progress",
      type: "insight",
      icon: Calendar,
      title: `${incompleteData.sessionsEnCours} session${incompleteData.sessionsEnCours > 1 ? 's' : ''} en cours`,
      description: "N'oubliez pas de faire signer les feuilles d'émargement",
      actionLabel: "Voir les sessions",
      section: "sessions",
      priority: "low",
      count: incompleteData.sessionsEnCours,
    });
  }
  
  // Exam alerts
  const examAlerts = alerts.filter(a => 
    (a.type === "exam_t3p" || a.type === "exam_pratique") && 
    a.priority === "high"
  );
  if (examAlerts.length > 0) {
    suggestions.push({
      id: "exams-upcoming",
      type: "warning",
      icon: Users,
      title: `${examAlerts.length} examen${examAlerts.length > 1 ? 's' : ''} à surveiller`,
      description: "Des examens arrivent bientôt ou nécessitent un résultat",
      actionLabel: "Voir les alertes",
      section: "alertes",
      priority: "high",
      count: examAlerts.length,
    });
  }
  
  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  
  const typeStyles = {
    action: { bg: "bg-primary/10", text: "text-primary", icon: CheckCircle2 },
    insight: { bg: "bg-accent", text: "text-accent-foreground", icon: Lightbulb },
    warning: { bg: "bg-destructive/10", text: "text-destructive", icon: AlertTriangle },
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Lightbulb className="h-5 w-5 text-primary" />
            Suggestions intelligentes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (suggestions.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Lightbulb className="h-5 w-5 text-primary" />
            Suggestions intelligentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-primary mb-3" />
            <p className="font-medium text-foreground">Tout est en ordre !</p>
            <p className="text-sm text-muted-foreground mt-1">
              Aucune action urgente à effectuer
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Lightbulb className="h-5 w-5 text-primary" />
          Suggestions intelligentes
          <Badge variant="secondary" className="ml-auto">
            {suggestions.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {suggestions.slice(0, 4).map((suggestion) => {
          const Icon = suggestion.icon;
          const styles = typeStyles[suggestion.type];
          
          return (
            <div
              key={suggestion.id}
              className={cn(
                "p-3 rounded-lg border transition-all cursor-pointer hover:shadow-sm",
                styles.bg,
                "border-transparent hover:border-border"
              )}
              onClick={() => onNavigate(suggestion.section)}
            >
              <div className="flex items-start gap-3">
                <div className={cn("p-2 rounded-lg", styles.bg)}>
                  <Icon className={cn("h-4 w-4", styles.text)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{suggestion.title}</p>
                    {suggestion.priority === "high" && (
                      <Badge variant="destructive" className="text-xs">Urgent</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {suggestion.description}
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="shrink-0 h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigate(suggestion.section);
                  }}
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
