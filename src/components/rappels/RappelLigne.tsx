import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import {
  AlertTriangle,
  BellRing,
  Calendar,
  Clock,
  FileSignature,
  FolderOpen,
  Euro,
  Check,
  CalendarClock,
  X,
} from "lucide-react";
import { addDays, format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { classerUrgence, type Rappel, type RappelSource } from "@/lib/rappels";

/**
 * Une ligne = une action, avec sa date et ses boutons. La couleur vient de
 * l'urgence (rouge = en retard), pas de la source : c'est le retard qui
 * décide de l'ordre dans lequel le directeur décroche son téléphone.
 */

const SOURCES: Record<RappelSource, { label: string; icon: typeof BellRing; teinte: string }> = {
  paiement: { label: "Paiement", icon: Euro, teinte: "bg-emerald-100 text-emerald-900 border-emerald-300" },
  dossier: { label: "Dossier", icon: FolderOpen, teinte: "bg-amber-100 text-amber-900 border-amber-300" },
  session: { label: "Session", icon: Calendar, teinte: "bg-violet-100 text-violet-900 border-violet-300" },
  signature: { label: "Signature", icon: FileSignature, teinte: "bg-sky-100 text-sky-900 border-sky-300" },
  libre: { label: "Perso", icon: BellRing, teinte: "bg-slate-100 text-slate-900 border-slate-300" },
};

const BORDURE_URGENCE = {
  retard: "border-l-destructive",
  aujourdhui: "border-l-warning",
  semaine: "border-l-info",
  plus_tard: "border-l-muted",
} as const;

interface RappelLigneProps {
  rappel: Rappel;
  onRelancer: (rappel: Rappel) => void;
  onEncaisser: (rappel: Rappel) => void;
  onOuvrir: (rappel: Rappel) => void;
  onReporter: (rappel: Rappel, jusquA: string | null) => void;
  onTerminer: (rappel: Rappel) => void;
  enCours?: boolean;
}

export function RappelLigne({
  rappel,
  onRelancer,
  onEncaisser,
  onOuvrir,
  onReporter,
  onTerminer,
  enCours,
}: RappelLigneProps) {
  const urgence = classerUrgence(rappel.joursDeRetard);
  const source = SOURCES[rappel.source];
  const IconeSource = source.icon;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-l-4 bg-card p-4 transition-colors sm:flex-row sm:items-center sm:justify-between",
        BORDURE_URGENCE[urgence],
        urgence === "retard" && "bg-destructive/[0.03]"
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
              source.teinte
            )}
          >
            <IconeSource className="h-3 w-3" />
            {source.label}
          </span>
          <button
            onClick={() => onOuvrir(rappel)}
            className="truncate text-sm font-semibold text-foreground hover:underline"
          >
            {rappel.titre}
          </button>
          <EtiquetteEcheance rappel={rappel} />
        </div>
        <p className="mt-1 truncate text-sm text-muted-foreground">{rappel.detail}</p>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {rappel.source === "paiement" && (
          <>
            <Button size="sm" variant="outline" disabled={enCours} onClick={() => onRelancer(rappel)}>
              Relancer
            </Button>
            <Button size="sm" disabled={enCours} onClick={() => onEncaisser(rappel)}>
              Encaisser
            </Button>
          </>
        )}
        {rappel.source === "signature" && (
          <Button size="sm" variant="outline" disabled={enCours} onClick={() => onOuvrir(rappel)}>
            Ouvrir la demande
          </Button>
        )}
        {rappel.source === "dossier" && (
          <Button size="sm" variant="outline" disabled={enCours} onClick={() => onOuvrir(rappel)}>
            Voir le dossier
          </Button>
        )}
        {rappel.source === "session" && (
          <Button size="sm" variant="outline" disabled={enCours} onClick={() => onOuvrir(rappel)}>
            Ouvrir la session
          </Button>
        )}
        {rappel.source === "libre" && (
          <Button size="sm" variant="outline" disabled={enCours} onClick={() => onTerminer(rappel)}>
            <Check className="mr-1 h-3.5 w-3.5" />
            Fait
          </Button>
        )}

        <BoutonReporter rappel={rappel} onReporter={onReporter} disabled={enCours} />
      </div>
    </div>
  );
}

function EtiquetteEcheance({ rappel }: { rappel: Rappel }) {
  const urgence = classerUrgence(rappel.joursDeRetard);

  if (urgence === "retard") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-destructive">
        <AlertTriangle className="h-3 w-3" />
        {rappel.joursDeRetard} j de retard
      </span>
    );
  }
  if (urgence === "aujourdhui") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-warning">
        <Clock className="h-3 w-3" />
        Aujourd'hui
      </span>
    );
  }
  return (
    <span className="text-[11px] text-muted-foreground">
      {format(new Date(rappel.dateEcheance), "d MMM", { locale: fr })}
    </span>
  );
}

const RACCOURCIS = [
  { label: "Demain", jours: 1 },
  { label: "Dans 3 jours", jours: 3 },
  { label: "La semaine prochaine", jours: 7 },
  { label: "Dans 1 mois", jours: 30 },
];

function BoutonReporter({
  rappel,
  onReporter,
  disabled,
}: {
  rappel: Rappel;
  onReporter: (rappel: Rappel, jusquA: string | null) => void;
  disabled?: boolean;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [dateLibre, setDateLibre] = useState("");

  const reporter = (jusquA: string | null) => {
    setOuvert(false);
    setDateLibre("");
    onReporter(rappel, jusquA);
  };

  return (
    <Popover open={ouvert} onOpenChange={setOuvert}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="ghost" disabled={disabled} title="Reporter ce rappel">
          <CalendarClock className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-60 p-2">
        <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Me le rappeler…</p>
        {RACCOURCIS.map((raccourci) => (
          <button
            key={raccourci.jours}
            onClick={() => reporter(format(addDays(new Date(), raccourci.jours), "yyyy-MM-dd"))}
            className="flex w-full items-center rounded-md px-2 py-1.5 text-sm hover:bg-accent"
          >
            {raccourci.label}
          </button>
        ))}
        <div className="mt-2 border-t pt-2">
          <Input
            type="date"
            value={dateLibre}
            min={format(addDays(new Date(), 1), "yyyy-MM-dd")}
            onChange={(e) => setDateLibre(e.target.value)}
            className="h-8 text-sm"
          />
          <Button
            size="sm"
            className="mt-2 w-full"
            disabled={!dateLibre}
            onClick={() => dateLibre && reporter(dateLibre)}
          >
            Reporter à cette date
          </Button>
        </div>
        {rappel.source !== "libre" && (
          <button
            onClick={() => reporter(null)}
            className="mt-2 flex w-full items-center gap-1.5 rounded-md border-t px-2 py-1.5 pt-3 text-xs text-muted-foreground hover:bg-accent"
          >
            <X className="h-3 w-3" />
            Ne plus me le rappeler
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}
