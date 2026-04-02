import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle2, XCircle, FileText, ChevronRight, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { SessionConformite } from '@/hooks/useQualiopiCentreData';

interface Props {
  sessions: SessionConformite[];
  maxItems?: number;
  onNavigateToSession?: (sessionId: string) => void;
}

export default function QualiopiSessionsNonConformes({ sessions, maxItems = 10, onNavigateToSession }: Props) {
  const displayed = sessions.slice(0, maxItems);

  if (displayed.length === 0) {
    return (
      <Card className="border-green-500/20">
        <CardContent className="p-6 text-center">
          <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-3" />
          <p className="font-semibold text-green-700">Toutes les sessions sont conformes</p>
          <p className="text-sm text-muted-foreground mt-1">Aucun problème détecté sur vos sessions actives</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          Sessions non conformes
          <Badge variant="destructive" className="ml-2">{sessions.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {displayed.map(session => (
            <div
              key={session.id}
              className={cn(
                "p-3 rounded-lg border transition-colors",
                session.nbProblemes >= 3 ? "bg-destructive/5 border-destructive/20" :
                session.nbProblemes >= 2 ? "bg-yellow-500/5 border-yellow-500/20" :
                "bg-muted/30 border-border"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm truncate">{session.nom}</p>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {session.formation_type}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(session.date_debut), 'dd MMM', { locale: fr })} — {format(new Date(session.date_fin), 'dd MMM yyyy', { locale: fr })}
                    </span>
                  </div>

                  {/* Problèmes */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {session.problemes.map((p, i) => (
                      <span key={i} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">
                        <XCircle className="h-3 w-3" />
                        {p}
                      </span>
                    ))}
                  </div>

                  {/* Conformité checks */}
                  <div className="flex gap-3 mt-2">
                    <CheckItem ok={session.hasProgramme} label="Programme" />
                    <CheckItem ok={session.hasEmargement} label="Émargement" />
                    <CheckItem ok={session.hasConvention} label="Convention" />
                    <CheckItem ok={session.hasSatisfaction} label="Satisfaction" />
                    <CheckItem ok={session.hasCertificats} label="Attestation" />
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                  <Badge variant={session.nbProblemes >= 3 ? 'destructive' : 'secondary'} className="text-xs">
                    {session.nbProblemes} problème{session.nbProblemes > 1 ? 's' : ''}
                  </Badge>
                  {session.actionRecommandee && (
                    <p className="text-xs text-primary font-medium text-right max-w-[160px]">
                      → {session.actionRecommandee}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {sessions.length > maxItems && (
          <p className="text-xs text-muted-foreground mt-3 text-center">
            … et {sessions.length - maxItems} autre(s) session(s)
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function CheckItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={cn(
      "text-xs flex items-center gap-1",
      ok ? "text-green-600" : "text-muted-foreground"
    )}>
      {ok ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3 text-destructive/50" />}
      {label}
    </span>
  );
}
