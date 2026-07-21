import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { creerFactureExpress, listerInscritsSansFacture } from "@/lib/facture-express";
import { envoyerRelancePaiement } from "@/lib/relance-paiement";
import {
  useSessionFactures,
  estFactureActive,
  estFactureEnRetard,
  type SessionFacture,
} from "@/hooks/useSessionFactures";
import { useSessionInscriptions } from "@/hooks/useSessions";
import { PaiementFormDialog } from "@/components/paiements/PaiementFormDialog";
import { Euro, Send, Zap } from "lucide-react";
import { SessionFinancialSummary } from "./SessionFinancialSummary";

interface SessionFinancesTabContentProps {
  sessionId: string;
}

interface LigneInscrit {
  inscriptionId: string;
  contactId: string;
  prenom: string;
  nom: string;
  email: string | null;
  facture: SessionFacture | null;
  nbAutresFactures: number;
  restant: number;
  enRetard: boolean;
}

const statutFactureLabels: Record<string, { label: string; class: string }> = {
  brouillon: { label: "Brouillon", class: "bg-muted text-muted-foreground" },
  emise: { label: "Émise", class: "bg-info/10 text-info" },
  payee: { label: "Payée", class: "bg-success/10 text-success" },
  partiel: { label: "Partiel", class: "bg-warning/10 text-warning" },
  impayee: { label: "Impayée", class: "bg-destructive/10 text-destructive" },
  annulee: { label: "Annulée", class: "bg-muted text-muted-foreground" },
};

export function SessionFinancesTabContent({ sessionId }: SessionFinancesTabContentProps) {
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [facturationPending, setFacturationPending] = useState(false);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [paiementCible, setPaiementCible] = useState<{ factureId: string; restant: number } | null>(null);
  const [relanceCible, setRelanceCible] = useState<LigneInscrit | null>(null);
  const [relancePendingId, setRelancePendingId] = useState<string | null>(null);

  const { data: inscriptions } = useSessionInscriptions(sessionId);
  const { data: facturesData } = useSessionFactures(sessionId);

  // Facturation groupée (règles du 21/07) : facture chaque inscrit sélectionné
  // au prix de la session, échéance = date de début. Sans envoi d'email en
  // lot — les envois se font depuis chaque fiche.
  const { data: aFacturer = [] } = useQuery({
    queryKey: ["session-inscrits-sans-facture", sessionId],
    queryFn: () => listerInscritsSansFacture(sessionId),
  });
  const { data: sessionInfo } = useQuery({
    queryKey: ["session-facturation-info", sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select("nom, prix, date_debut")
        .eq("id", sessionId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const lignes = useMemo((): LigneInscrit[] => {
    if (!inscriptions || !facturesData) return [];
    return inscriptions
      .map((i) => {
        const contact = (i as { contacts?: { prenom?: string; nom?: string; email?: string | null } }).contacts;
        const toutes = (facturesData.parInscription[i.id] || []).filter(estFactureActive);
        // La facture « principale » affichée : la plus récente non soldée,
        // sinon la plus récente tout court.
        const nonSoldees = toutes.filter((f) => f.montant_total - f.total_paye > 0);
        const facture = nonSoldees[0] || toutes[0] || null;
        const restant = toutes.reduce((s, f) => s + Math.max(0, f.montant_total - f.total_paye), 0);
        return {
          inscriptionId: i.id,
          contactId: i.contact_id,
          prenom: contact?.prenom || "",
          nom: contact?.nom || "",
          email: contact?.email || null,
          facture,
          nbAutresFactures: Math.max(0, toutes.length - 1),
          restant,
          enRetard: toutes.some(estFactureEnRetard),
        };
      })
      .sort((a, b) => {
        // Non facturés d'abord, puis en retard, puis restant décroissant.
        if (!a.facture !== !b.facture) return a.facture ? 1 : -1;
        if (a.enRetard !== b.enRetard) return a.enRetard ? -1 : 1;
        return b.restant - a.restant || a.nom.localeCompare(b.nom);
      });
  }, [inscriptions, facturesData]);

  const invalidations = () => {
    queryClient.invalidateQueries({ queryKey: ["factures"] });
    queryClient.invalidateQueries({ queryKey: ["session-factures", sessionId] });
    queryClient.invalidateQueries({ queryKey: ["session-inscrits-sans-facture", sessionId] });
  };

  const ouvrirFacturationGroupee = () => {
    setSelection(new Set(aFacturer.map((i) => i.sessionInscriptionId)));
    setConfirmOpen(true);
  };

  const facturerInscrit = (inscriptionId: string) => {
    setSelection(new Set([inscriptionId]));
    setConfirmOpen(true);
  };

  const facturerSelection = async () => {
    if (!sessionInfo?.prix) { toast.error("La session n'a pas de prix renseigné"); return; }
    const cibles = aFacturer.filter((i) => selection.has(i.sessionInscriptionId));
    if (cibles.length === 0) return;
    setFacturationPending(true);
    let ok = 0;
    const echecs: string[] = [];
    for (const inscrit of cibles) {
      try {
        await creerFactureExpress({
          contactId: inscrit.contactId,
          sessionInscriptionId: inscrit.sessionInscriptionId,
          montant: Number(sessionInfo.prix),
          description: sessionInfo.nom,
          dateEcheance: sessionInfo.date_debut || null,
        });
        ok++;
      } catch (err) {
        console.error("facturation express:", inscrit.prenom, inscrit.nom, err);
        echecs.push(`${inscrit.prenom} ${inscrit.nom}`);
      }
    }
    setFacturationPending(false);
    setConfirmOpen(false);
    invalidations();
    if (echecs.length === 0) {
      toast.success(`${ok} facture${ok > 1 ? "s" : ""} créée${ok > 1 ? "s" : ""}`);
    } else {
      toast.warning(`${ok} créée${ok > 1 ? "s" : ""}, ${echecs.length} en échec`, { description: echecs.join(", ") });
    }
  };

  const envoyerRelance = async (ligne: LigneInscrit) => {
    if (!ligne.facture || !ligne.email) return;
    setRelancePendingId(ligne.inscriptionId);
    toast.loading("Envoi de la relance...", { id: "relance-" + ligne.facture.id });
    try {
      await envoyerRelancePaiement({
        factureId: ligne.facture.id,
        numeroFacture: ligne.facture.numero_facture,
        contactId: ligne.contactId,
        email: ligne.email,
        prenom: ligne.prenom,
        nom: ligne.nom,
        montantRestant: Math.max(0, ligne.facture.montant_total - ligne.facture.total_paye),
        dateEcheance: ligne.facture.date_echeance,
      });
      toast.success("Relance envoyée à " + ligne.email, { id: "relance-" + ligne.facture.id });
    } catch (err) {
      console.error("Erreur envoi relance:", err);
      toast.error(
        "Erreur lors de l'envoi de la relance: " + ((err as Error).message || "Erreur inconnue"),
        { id: "relance-" + ligne.facture.id },
      );
    } finally {
      setRelancePendingId(null);
    }
  };

  const selectionnes = aFacturer.filter((i) => selection.has(i.sessionInscriptionId));

  return (
    <div className="space-y-4 pt-4">
      <SessionFinancialSummary sessionId={sessionId} />

      {aFacturer.length > 0 && (
        <Button className="w-full justify-start" onClick={ouvrirFacturationGroupee} disabled={facturationPending}>
          <Zap className="h-4 w-4 mr-2" />
          Facturer les non-facturés ({aFacturer.length})
        </Button>
      )}

      {lignes.length > 0 && (
        <div className="rounded-xl border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Stagiaire</TableHead>
                <TableHead className="font-semibold">Facture</TableHead>
                <TableHead className="font-semibold text-right">Restant</TableHead>
                <TableHead className="font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lignes.map((ligne) => (
                <TableRow key={ligne.inscriptionId}>
                  <TableCell className="font-medium text-sm">
                    {ligne.prenom} {ligne.nom}
                  </TableCell>
                  <TableCell>
                    {ligne.facture ? (
                      <span className="inline-flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-xs">{ligne.facture.numero_facture}</span>
                        <Badge className={cn("text-[10px]", statutFactureLabels[ligne.facture.statut]?.class)}>
                          {statutFactureLabels[ligne.facture.statut]?.label || ligne.facture.statut}
                        </Badge>
                        {ligne.enRetard && (
                          <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/30">
                            Retard
                          </Badge>
                        )}
                        {ligne.nbAutresFactures > 0 && (
                          <span className="text-[10px] text-muted-foreground">+{ligne.nbAutresFactures}</span>
                        )}
                      </span>
                    ) : (
                      <Badge variant="outline" className="text-[10px] border-warning/40 text-warning">
                        Non facturé
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {ligne.facture
                      ? ligne.restant > 0
                        ? <span className="font-semibold">{ligne.restant.toLocaleString("fr-FR")} €</span>
                        : <span className="text-success text-xs">✓ Soldée</span>
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {!ligne.facture && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          disabled={facturationPending}
                          onClick={() => facturerInscrit(ligne.inscriptionId)}
                        >
                          <Zap className="h-3.5 w-3.5 mr-1" />
                          Facturer
                        </Button>
                      )}
                      {ligne.facture && ligne.restant > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() =>
                            setPaiementCible({
                              factureId: ligne.facture!.id,
                              restant: Math.max(0, ligne.facture!.montant_total - ligne.facture!.total_paye),
                            })
                          }
                        >
                          <Euro className="h-3.5 w-3.5 mr-1" />
                          Encaisser
                        </Button>
                      )}
                      {ligne.facture && ligne.enRetard && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          disabled={relancePendingId === ligne.inscriptionId}
                          onClick={() => setRelanceCible(ligne)}
                        >
                          <Send className="h-3.5 w-3.5 mr-1" />
                          Relancer
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Facturer {selectionnes.length} inscrit{selectionnes.length > 1 ? "s" : ""} ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Une facture de {sessionInfo?.prix != null ? Number(sessionInfo.prix).toLocaleString("fr-FR") : "—"} €
              sera créée pour chaque inscrit coché, échéance au début de la session.
              Aucun email n'est envoyé — les envois se font ensuite depuis chaque fiche.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="max-h-56 overflow-y-auto space-y-1.5 rounded-lg border p-3">
            {aFacturer.map((i) => (
              <label key={i.sessionInscriptionId} className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={selection.has(i.sessionInscriptionId)}
                  onCheckedChange={(checked) => {
                    setSelection((prev) => {
                      const next = new Set(prev);
                      if (checked) next.add(i.sessionInscriptionId);
                      else next.delete(i.sessionInscriptionId);
                      return next;
                    });
                  }}
                />
                {i.prenom} {i.nom}
              </label>
            ))}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={facturationPending}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); facturerSelection(); }}
              disabled={facturationPending || selectionnes.length === 0}
            >
              {facturationPending
                ? "Facturation…"
                : `Créer ${selectionnes.length} facture${selectionnes.length > 1 ? "s" : ""}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!relanceCible} onOpenChange={(open) => !open && setRelanceCible(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Envoyer une relance de paiement ?</AlertDialogTitle>
            <AlertDialogDescription>
              {relanceCible && (
                relanceCible.email ? (
                  <>
                    Un email de relance pour la facture{" "}
                    <span className="font-medium text-foreground">{relanceCible.facture?.numero_facture}</span>
                    {" "}({relanceCible.restant.toLocaleString("fr-FR")} € restant dû) sera envoyé
                    immédiatement à{" "}
                    <span className="font-medium text-foreground">{relanceCible.email}</span>.
                  </>
                ) : (
                  <>Ce contact n'a pas d'adresse email : la relance ne peut pas être envoyée. Renseignez l'email sur sa fiche.</>
                )
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            {relanceCible?.email && (
              <AlertDialogAction
                onClick={() => {
                  if (relanceCible) envoyerRelance(relanceCible);
                  setRelanceCible(null);
                }}
              >
                Envoyer la relance
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {paiementCible && (
        <PaiementFormDialog
          open={!!paiementCible}
          onOpenChange={(open) => !open && setPaiementCible(null)}
          factureId={paiementCible.factureId}
          montantRestant={paiementCible.restant}
        />
      )}
    </div>
  );
}
