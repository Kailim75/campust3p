import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Loader2, Brain, TrendingUp, TrendingDown, Minus,
  Phone, Mail, MessageSquare, MapPin, Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PredictiveAnalysis, PredictiveProspect, PredictiveTendance, PredictiveSegment } from "@/hooks/usePredictiveAnalysis";

const canalIcons: Record<string, React.ReactNode> = {
  email: <Mail className="h-3.5 w-3.5" />,
  telephone: <Phone className="h-3.5 w-3.5" />,
  sms: <MessageSquare className="h-3.5 w-3.5" />,
  whatsapp: <MessageSquare className="h-3.5 w-3.5" />,
  rdv_physique: <MapPin className="h-3.5 w-3.5" />,
};

const canalLabels: Record<string, string> = {
  email: "Email",
  telephone: "Téléphone",
  sms: "SMS",
  whatsapp: "WhatsApp",
  rdv_physique: "RDV physique",
};

const impactIcons: Record<string, React.ReactNode> = {
  positif: <TrendingUp className="h-3.5 w-3.5 text-green-500" />,
  negatif: <TrendingDown className="h-3.5 w-3.5 text-red-500" />,
  neutre: <Minus className="h-3.5 w-3.5 text-muted-foreground" />,
};

interface Props {
  analysis: PredictiveAnalysis | null;
  isAnalyzing: boolean;
  onAnalyze: () => void;
  prospectMap: Map<string, any>;
}

export default function PredictiveAnalysisCard({ analysis, isAnalyzing, onAnalyze, prospectMap }: Props) {
  if (!analysis && !isAnalyzing) {
    return (
      <Card className="border-dashed border-2">
        <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
          <Brain className="h-10 w-10 text-muted-foreground/40" />
          <div className="text-center">
            <p className="font-medium text-foreground">Analyse prédictive IA</p>
            <p className="text-sm text-muted-foreground mt-1">
              Prédisez les conversions et obtenez des recommandations de relance optimales
            </p>
          </div>
          <Button onClick={onAnalyze} className="gap-2">
            <Brain className="h-4 w-4" />
            Lancer l'analyse prédictive
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isAnalyzing) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">L'IA analyse les patterns de conversion...</p>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) return null;

  return (
    <div className="space-y-4">
      {/* KPI Header */}
      <Card className="border-primary/20">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" />
              Analyse Prédictive
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onAnalyze} className="gap-1 text-xs">
              <Brain className="h-3 w-3" />
              Relancer
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">{analysis.resume}</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <p className="text-2xl font-bold text-foreground">{analysis.taux_conversion_predit}%</p>
              <p className="text-[10px] text-muted-foreground">Taux conversion prédit (30j)</p>
            </div>
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 text-center">
              <p className="text-2xl font-bold text-foreground">
                {analysis.ca_predit_30j.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}€
              </p>
              <p className="text-[10px] text-muted-foreground">CA prédit à 30j</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Prospects prioritaires */}
      {analysis.prospects_prioritaires?.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Prospects prioritaires ({analysis.prospects_prioritaires.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {analysis.prospects_prioritaires.slice(0, 8).map((p, i) => {
              const prospect = prospectMap.get(p.prospect_id);
              return (
                <div key={i} className="p-3 rounded-lg bg-muted/30 border hover:border-primary/20 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {prospect ? `${prospect.prenom} ${prospect.nom}` : p.prospect_id.slice(0, 8)}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px] gap-1">
                          {canalIcons[p.canal_optimal]}
                          {canalLabels[p.canal_optimal] || p.canal_optimal}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {p.moment_optimal}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <div className="flex items-center gap-1">
                        <Progress value={p.probabilite_conversion} className="w-16 h-1.5" />
                        <span className="text-xs font-bold text-foreground">{p.probabilite_conversion}%</span>
                      </div>
                    </div>
                  </div>
                  {p.message_suggere && (
                    <p className="text-[10px] text-muted-foreground mt-2 italic border-l-2 border-primary/20 pl-2">
                      "{p.message_suggere}"
                    </p>
                  )}
                  {p.facteurs_cles && p.facteurs_cles.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {p.facteurs_cles.map((f, fi) => (
                        <Badge key={fi} variant="outline" className="text-[9px] py-0">{f}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Tendances */}
      {analysis.tendances?.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tendances détectées</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {analysis.tendances.map((t, i) => (
              <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/30">
                <div className="mt-0.5">{impactIcons[t.impact]}</div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-foreground">{t.tendance}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{t.recommandation}</p>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[9px]",
                    t.impact === "positif" && "bg-green-500/10 text-green-600 border-green-500/20",
                    t.impact === "negatif" && "bg-red-500/10 text-red-600 border-red-500/20",
                    t.impact === "neutre" && "bg-muted text-muted-foreground"
                  )}
                >
                  {t.impact}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Segments */}
      {analysis.segments && analysis.segments.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Segments identifiés</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analysis.segments.map((s, i) => (
                <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30">
                  <div className="flex-1">
                    <p className="text-xs font-medium text-foreground">{s.nom}</p>
                    <p className="text-[10px] text-muted-foreground">{s.strategie}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-foreground">{s.count}</p>
                    <p className="text-[10px] text-muted-foreground">{s.conversion_rate}% conv.</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
