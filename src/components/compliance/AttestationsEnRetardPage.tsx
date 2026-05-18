// ═══════════════════════════════════════════════════════════════
// AttestationsEnRetardPage — Cockpit de rattrapage Qualiopi
// Liste les sessions terminées sans attestation et permet
// de relancer la clôture (génération + envoi) via le wizard existant.
// ═══════════════════════════════════════════════════════════════

import { useMemo, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertTriangle, FileWarning, Loader2, Send } from "lucide-react";
import { useLateAttestations } from "@/hooks/useLateAttestations";
import { useSession } from "@/hooks/useSessions";
import { useSessionInscrits } from "@/hooks/useSessionInscrits";
import { CloseSessionDialog } from "@/components/sessions/CloseSessionDialog";
import { useCentreContext } from "@/contexts/CentreContext";

function CloseSessionLauncher({
  sessionId,
  open,
  onOpenChange,
  onSuccess,
}: {
  sessionId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSuccess: () => void;
}) {
  const { data: session, isLoading: loadingSession } = useSession(sessionId);
  const { inscrits, isLoading: loadingInscrits } = useSessionInscrits(sessionId);

  if (!open) return null;
  if (loadingSession || loadingInscrits || !session) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <CloseSessionDialog
      session={session as any}
      inscriptions={inscrits ?? []}
      open={open}
      onOpenChange={onOpenChange}
      onSuccess={onSuccess}
    />
  );
}

export function AttestationsEnRetardPage() {
  const { centreId } = useCentreContext();
  const { data: items, isLoading, refetch } = useLateAttestations(centreId);
  const [activeSession, setActiveSession] = useState<string | null>(null);

  const totals = useMemo(() => {
    const t = { sessions: items?.length ?? 0, apprenants: 0, aGenerer: 0, aEnvoyer: 0 };
    (items ?? []).forEach((s) => {
      t.apprenants += s.nbApprenants;
      t.aGenerer += s.nbAGenerer;
      t.aEnvoyer += s.nbAEnvoyer;
    });
    return t;
  }, [items]);

  return (
    <div className="min-h-screen">
      <Header
        title="Attestations en retard"
        subtitle="Sessions terminées sans attestation générée ou envoyée"
      />

      <main className="p-3 sm:p-6 animate-fade-in space-y-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Risque Qualiopi</AlertTitle>
          <AlertDescription>
            Chaque session terminée doit faire l'objet d'une attestation remise à l'apprenant.
            Utilisez le wizard de clôture session pour générer et envoyer les attestations en lot.
          </AlertDescription>
        </Alert>

        <div className="grid gap-4 sm:grid-cols-4">
          <KpiCard label="Sessions concernées" value={totals.sessions} />
          <KpiCard label="Apprenants impactés" value={totals.apprenants} />
          <KpiCard label="Attestations à générer" value={totals.aGenerer} tone="warning" />
          <KpiCard label="Attestations à envoyer" value={totals.aEnvoyer} tone="warning" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileWarning className="h-5 w-5 text-destructive" />
              Sessions à rattraper
            </CardTitle>
            <CardDescription>
              Cliquez sur « Clôturer » pour ouvrir le wizard de clôture session — il génère
              les attestations manquantes et envoie les emails aux apprenants.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !items || items.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                ✅ Aucune attestation en retard. Bravo !
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Session</TableHead>
                      <TableHead>Date fin</TableHead>
                      <TableHead className="text-center">Retard</TableHead>
                      <TableHead className="text-center">Apprenants</TableHead>
                      <TableHead className="text-center">À générer</TableHead>
                      <TableHead className="text-center">À envoyer</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((s) => (
                      <TableRow key={s.sessionId}>
                        <TableCell className="font-medium">{s.sessionNom ?? "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {s.dateFin ? new Date(s.dateFin).toLocaleDateString("fr-FR") : "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={s.joursDeRetard > 30 ? "destructive" : "secondary"}>
                            {s.joursDeRetard} j
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">{s.nbApprenants}</TableCell>
                        <TableCell className="text-center">
                          {s.nbAGenerer > 0 ? (
                            <Badge variant="destructive">{s.nbAGenerer}</Badge>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {s.nbAEnvoyer > 0 ? (
                            <Badge variant="secondary">{s.nbAEnvoyer}</Badge>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            onClick={() => setActiveSession(s.sessionId)}
                            className="gap-1"
                          >
                            <Send className="h-3.5 w-3.5" />
                            Clôturer
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {activeSession && (
          <CloseSessionLauncher
            sessionId={activeSession}
            open={!!activeSession}
            onOpenChange={(o) => !o && setActiveSession(null)}
            onSuccess={() => {
              setActiveSession(null);
              refetch();
            }}
          />
        )}
      </main>
    </div>
  );
}

function KpiCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "warning";
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p
          className={`text-3xl font-bold ${
            tone === "warning" && value > 0 ? "text-destructive" : "text-foreground"
          }`}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
