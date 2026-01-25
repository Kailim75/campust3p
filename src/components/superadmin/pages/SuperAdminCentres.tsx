import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useCentresStats, type CentreStats } from "@/hooks/useCentres";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Search, Plus, ExternalLink, Users, BookOpen, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export function SuperAdminCentres() {
  const { data: centres, isLoading } = useCentresStats();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCentres = centres?.filter(centre => 
    centre.nom.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const getHealthBadge = (score: number | null) => {
    if (!score) return <Badge variant="secondary">Non évalué</Badge>;
    if (score >= 80) return <Badge className="bg-success/10 text-success border-success/30">Excellent</Badge>;
    if (score >= 60) return <Badge className="bg-warning/10 text-warning border-warning/30">Attention</Badge>;
    return <Badge className="bg-destructive/10 text-destructive border-destructive/30">Critique</Badge>;
  };

  const getPlanBadge = (plan: string) => {
    const colors: Record<string, string> = {
      premium: "bg-superadmin-accent/10 text-superadmin-accent border-superadmin-accent/30",
      pro: "bg-superadmin-primary/10 text-superadmin-primary border-superadmin-primary/30",
      essentiel: "bg-muted text-muted-foreground",
    };
    return <Badge variant="outline" className={colors[plan] || colors.essentiel}>{plan}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full max-w-sm" />
        <div className="grid gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un centre..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Nouveau centre
        </Button>
      </div>

      {/* Centres Grid */}
      <div className="grid gap-4">
        {filteredCentres.map((centre) => (
          <Card key={centre.id} className="bg-superadmin-card border-superadmin-border hover:border-superadmin-primary/30 transition-colors">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-superadmin-primary/10 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-superadmin-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg text-superadmin-foreground">{centre.nom}</CardTitle>
                    <CardDescription className="text-superadmin-muted">
                      Créé le {format(new Date(centre.created_at), "d MMMM yyyy", { locale: fr })}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getPlanBadge(centre.plan_type)}
                  {getHealthBadge(centre.health_score)}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-6 text-sm">
                <div className="flex items-center gap-2 text-superadmin-muted">
                  <Users className="h-4 w-4" />
                  <span className="text-superadmin-foreground font-medium">{centre.nb_users}</span> utilisateurs
                </div>
                <div className="flex items-center gap-2 text-superadmin-muted">
                  <BookOpen className="h-4 w-4" />
                  <span className="text-superadmin-foreground font-medium">{centre.nb_contacts}</span> apprenants
                </div>
                <div className="flex items-center gap-2 text-superadmin-muted">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-superadmin-foreground font-medium">{centre.ca_total.toLocaleString()}€</span> CA
                </div>
                <Button variant="ghost" size="sm" className="ml-auto gap-2 text-superadmin-primary hover:text-superadmin-primary/80">
                  <ExternalLink className="h-4 w-4" />
                  Accéder
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredCentres.length === 0 && (
          <Card className="bg-superadmin-card border-superadmin-border">
            <CardContent className="py-12 text-center">
              <Building2 className="h-12 w-12 mx-auto text-superadmin-muted mb-4" />
              <p className="text-superadmin-muted">
                {searchQuery ? "Aucun centre ne correspond à votre recherche" : "Aucun centre enregistré"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
