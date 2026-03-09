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
    <div className="grid grid-cols-3 gap-2 mt-4">
      <div className="bg-card border rounded-lg p-2.5 text-center">
        <p className="text-[10px] font-medium text-muted-foreground">Inscrits / Places</p>
        <p className={cn("text-sm font-bold", placesRestantes <= 0 ? "text-success" : "text-foreground")}>
          {inscriptionCount} / {placesTotales}
        </p>
      </div>
      <div className="bg-card border rounded-lg p-2.5 text-center">
        <p className="text-[10px] font-medium text-muted-foreground">Prix session</p>
        <p className="text-sm font-bold text-foreground">
          {prix ? `${Number(prix).toLocaleString('fr-FR')} €` : '—'}
        </p>
      </div>
      <div className="bg-card border rounded-lg p-2.5 text-center">
        <p className="text-[10px] font-medium text-muted-foreground">Qualiopi</p>
        <p className="text-sm font-bold text-foreground">
          {qualiopiScore !== null ? `${qualiopiScore}%` : '—'}
        </p>
      </div>
    </div>
  );
}
