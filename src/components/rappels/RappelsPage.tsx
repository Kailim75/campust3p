import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ApprenantDetailSheet } from "@/components/apprenants/ApprenantDetailSheet";
import { PaiementFormDialog } from "@/components/paiements/PaiementFormDialog";
import { NouveauRappelDialog } from "./NouveauRappelDialog";
import { RappelLigne } from "./RappelLigne";
import { useRappels, useReporterRappel, useCloturerRappelLibre } from "@/hooks/useRappels";
import { envoyerRelancePaiement } from "@/lib/relance-paiement";
import { classerUrgence, compterParUrgence, type Rappel, type RappelUrgence } from "@/lib/rappels";
import { BellRing, Plus, Search, CheckCircle2, AlertTriangle, Euro } from "lucide-react";
import { addDays, format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * « Rappels » — la liste datée de ce que le directeur doit relancer
 * (chantier du 03/08/2026).
 *
 * Différence avec « Aujourd'hui », qui traite les mêmes sujets par blocs :
 * ici tout porte une échéance et tout se reporte. Rien ne part
 * automatiquement — chaque relance est déclenchée par un clic (décision du
 * 23/07/2026).
 */

type Filtre = RappelUrgence | "tous";

const FILTRES: { value: Filtre; label: string }[] = [
  { value: "retard", label: "En retard" },
  { value: "aujourdhui", label: "Aujourd'hui" },
  { value: "semaine", label: "Cette semaine" },
  { value: "tous", label: "Tout" },
];

/** Après une relance envoyée, on laisse ce délai avant de la reproposer. */
const DELAI_APRES_RELANCE_JOURS = 7;

export function RappelsPage() {
  const navigate = useNavigate();
  const { rappels, isLoading } = useRappels();
  const reporter = useReporterRappel();
  const cloturer = useCloturerRappelLibre();

  const [filtre, setFiltre] = useState<Filtre>("retard");
  const [recherche, setRecherche] = useState("");
  const [contactOuvert, setContactOuvert] = useState<string | null>(null);
  const [ficheOuverte, setFicheOuverte] = useState(false);
  const [nouveauOuvert, setNouveauOuvert] = useState(false);
  const [encaissement, setEncaissement] = useState<Rappel | null>(null);
  const [enCours, setEnCours] = useState<string | null>(null);

  const compteurs = useMemo(() => compterParUrgence(rappels), [rappels]);

  const montantEnRetard = useMemo(
    () =>
      rappels
        .filter((r) => r.source === "paiement" && r.joursDeRetard > 0)
        .reduce((total, r) => total + (r.montant ?? 0), 0),
    [rappels]
  );

  const visibles = useMemo(() => {
    const terme = recherche.trim().toLowerCase();
    return rappels.filter((r) => {
      if (filtre !== "tous" && classerUrgence(r.joursDeRetard) !== filtre) return false;
      if (!terme) return true;
      return `${r.titre} ${r.detail}`.toLowerCase().includes(terme);
    });
  }, [rappels, filtre, recherche]);

  const ouvrir = (rappel: Rappel) => {
    if (rappel.source === "session" && rappel.sessionId) {
      navigate(`/sessions?id=${rappel.sessionId}`);
      return;
    }
    if (rappel.source === "signature") {
      navigate("/signatures");
      return;
    }
    if (rappel.contactId) {
      setContactOuvert(rappel.contactId);
      setFicheOuverte(true);
    }
  };

  const relancer = async (rappel: Rappel) => {
    if (!rappel.contactEmail || !rappel.factureId || !rappel.contactId) {
      toast.error("Pas d'email sur cette fiche", {
        description: "Ouvrez la fiche pour renseigner une adresse.",
        action: { label: "Ouvrir", onClick: () => ouvrir(rappel) },
      });
      return;
    }

    setEnCours(rappel.id);
    try {
      const [prenom, ...reste] = (rappel.contactNom || "").split(" ");
      await envoyerRelancePaiement({
        factureId: rappel.factureId,
        numeroFacture: rappel.numeroFacture || "—",
        contactId: rappel.contactId,
        email: rappel.contactEmail,
        prenom: prenom || "",
        nom: reste.join(" "),
        montantRestant: rappel.montant ?? 0,
        dateEcheance: rappel.dateEcheance,
      });

      // La facture reste due : sans report, la ligne resterait affichée le
      // lendemain alors que la relance vient de partir.
      await reporter.mutateAsync({
        rappelId: rappel.id,
        jusquA: format(addDays(new Date(), DELAI_APRES_RELANCE_JOURS), "yyyy-MM-dd"),
      });
      toast.success(`Relance envoyée à ${rappel.titre}`, {
        description: `Réapparaîtra dans ${DELAI_APRES_RELANCE_JOURS} jours si la facture n'est pas soldée.`,
      });
    } catch {
      toast.error("L'email n'est pas parti", { description: "Réessayez ou relancez par téléphone." });
    } finally {
      setEnCours(null);
    }
  };

  const afficherVide = !isLoading && visibles.length === 0;

  return (
    <div className="min-h-screen">
      <Header title="Rappels" subtitle="Qui relancer, et quand" />

      <main className="animate-fade-in space-y-4 p-3 sm:space-y-6 sm:p-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Carte
            icone={AlertTriangle}
            valeur={String(compteurs.retard)}
            libelle="en retard"
            teinte="text-destructive"
            fond="bg-destructive/10"
          />
          <Carte
            icone={BellRing}
            valeur={String(compteurs.aujourdhui)}
            libelle="à faire aujourd'hui"
            teinte="text-warning"
            fond="bg-warning/10"
          />
          <Carte
            icone={Euro}
            valeur={`${montantEnRetard.toLocaleString("fr-FR")} €`}
            libelle="impayés en retard"
            teinte="text-primary"
            fond="bg-primary/10"
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex w-fit gap-1 rounded-xl bg-muted p-1">
            {FILTRES.map((f) => (
              <button
                key={f.value}
                onClick={() => setFiltre(f.value)}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition-colors sm:px-4",
                  filtre === f.value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {f.label}
                <span className="ml-1.5 text-xs opacity-60">
                  ({f.value === "tous" ? compteurs.tous : compteurs[f.value]})
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher un nom…"
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button onClick={() => setNouveauOuvert(true)}>
              <Plus className="mr-1 h-4 w-4" />
              Nouveau rappel
            </Button>
          </div>
        </div>

        {isLoading && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        )}

        {afficherVide && (
          <EmptyState
            icon={CheckCircle2}
            title={filtre === "retard" ? "Aucun retard" : "Rien à relancer"}
            description={
              recherche
                ? "Aucun rappel ne correspond à cette recherche."
                : "Tout est à jour sur cette période. Les nouveaux rappels apparaîtront ici automatiquement."
            }
          />
        )}

        {!isLoading && visibles.length > 0 && (
          <div className="space-y-2">
            {visibles.map((rappel) => (
              <RappelLigne
                key={rappel.id}
                rappel={rappel}
                enCours={enCours === rappel.id}
                onRelancer={relancer}
                onEncaisser={setEncaissement}
                onOuvrir={ouvrir}
                onReporter={(r, jusquA) => reporter.mutate({ rappelId: r.id, jusquA })}
                onTerminer={(r) => r.historiqueId && cloturer.mutate(r.historiqueId)}
              />
            ))}
          </div>
        )}
      </main>

      <ApprenantDetailSheet
        contactId={contactOuvert}
        open={ficheOuverte}
        onOpenChange={setFicheOuverte}
        syncUrl={false}
      />

      <NouveauRappelDialog open={nouveauOuvert} onOpenChange={setNouveauOuvert} />

      {encaissement?.factureId && (
        <PaiementFormDialog
          open
          onOpenChange={(o) => !o && setEncaissement(null)}
          factureId={encaissement.factureId}
          montantRestant={encaissement.montant ?? 0}
        />
      )}
    </div>
  );
}

function Carte({
  icone: Icone,
  valeur,
  libelle,
  teinte,
  fond,
}: {
  icone: typeof BellRing;
  valeur: string;
  libelle: string;
  teinte: string;
  fond: string;
}) {
  return (
    <Card className="card-elevated p-3">
      <div className="flex items-center gap-3">
        <div className={cn("shrink-0 rounded-lg p-2", fond)}>
          <Icone className={cn("h-4 w-4", teinte)} />
        </div>
        <div className="min-w-0 flex-1">
          <p className={cn("text-xl font-bold leading-none tracking-tight", teinte)}>{valeur}</p>
          <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">{libelle}</p>
        </div>
      </div>
    </Card>
  );
}

export default RappelsPage;
