import { cn } from "@/lib/utils";

interface SessionKPICockpitProps {
  inscriptionCount: number;
  placesTotales: number;
  prix: number | null;
  qualiopiScore: number | null;
}

export function SessionKPICockpit({
  inscriptionCount,
  placesTotales,
  prix,
  qualiopiScore,
}: SessionKPICockpitProps) {
  const placesRestantes = placesTotales - inscriptionCount;

  return (
    <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mt-3 sm:mt-4">
      <div className="bg-card border rounded-lg p-2 sm:p-2.5 text-center">
        <p className="text-[9px] sm:text-[10px] font-medium text-muted-foreground leading-tight">Inscrits / Places</p>
        <p className={cn("text-xs sm:text-sm font-bold mt-0.5", placesRestantes <= 0 ? "text-success" : "text-foreground")}>
          {inscriptionCount} / {placesTotales}
        </p>
      </div>
      <div className="bg-card border rounded-lg p-2 sm:p-2.5 text-center">
        <p className="text-[9px] sm:text-[10px] font-medium text-muted-foreground leading-tight">Prix session</p>
        <p className="text-xs sm:text-sm font-bold text-foreground mt-0.5">
          {prix ? `${Number(prix).toLocaleString('fr-FR')} €` : '—'}
        </p>
      </div>
      <div className="bg-card border rounded-lg p-2 sm:p-2.5 text-center">
        <p className="text-[9px] sm:text-[10px] font-medium text-muted-foreground leading-tight">Qualiopi</p>
        <p className="text-xs sm:text-sm font-bold text-foreground mt-0.5">
          {qualiopiScore !== null ? `${qualiopiScore}%` : '—'}
        </p>
      </div>
    </div>
  );
}
