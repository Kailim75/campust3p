import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Clock, Euro, Edit, Trash2, Download, Percent, 
  Car, Truck, Bike, Briefcase, Package, EyeOff
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type CatalogueFormation } from "@/hooks/useCatalogueFormations";

interface CatalogueArticleCardProps {
  formation: CatalogueFormation;
  onEdit: (formation: CatalogueFormation) => void;
  onDelete: (id: string) => void;
  onDownloadProgramme?: (formation: CatalogueFormation) => void;
  canDownloadProgramme?: boolean;
}

const typeLabels: Record<string, { label: string; class: string }> = {
  initiale: { label: "Initiale", class: "bg-primary/10 text-primary border-primary/20" },
  continue: { label: "Continue", class: "bg-warning/10 text-warning border-warning/20" },
  mobilite: { label: "Mobilité", class: "bg-info/10 text-info border-info/20" },
  accompagnement: { label: "Accompagnement", class: "bg-success/10 text-success border-success/20" },
  autre: { label: "Service", class: "bg-muted text-muted-foreground border-muted" },
};

const categoryConfig: Record<string, { icon: typeof Car; accent: string; bg: string; gradient: string }> = {
  Taxi: { icon: Car, accent: "text-primary", bg: "bg-primary/6", gradient: "from-primary/10 to-primary/4" },
  VTC: { icon: Car, accent: "text-success", bg: "bg-success/6", gradient: "from-success/10 to-success/4" },
  VMDTR: { icon: Bike, accent: "text-info", bg: "bg-info/6", gradient: "from-info/10 to-info/4" },
  Accompagnement: { icon: Briefcase, accent: "text-warning", bg: "bg-warning/6", gradient: "from-warning/10 to-warning/4" },
  Autre: { icon: Package, accent: "text-muted-foreground", bg: "bg-muted/50", gradient: "from-muted/30 to-muted/10" },
  Services: { icon: Package, accent: "text-muted-foreground", bg: "bg-muted/50", gradient: "from-muted/30 to-muted/10" },
};

const formatPrix = (prix: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(prix);

export function CatalogueArticleCard({
  formation,
  onEdit,
  onDelete,
  onDownloadProgramme,
  canDownloadProgramme,
}: CatalogueArticleCardProps) {
  const config = categoryConfig[formation.categorie] || categoryConfig.Autre;
  const typeInfo = typeLabels[formation.type_formation] || typeLabels.autre;
  const CategoryIcon = config.icon;

  return (
    <div
      className={cn(
        "group relative flex flex-col rounded-xl border bg-card overflow-hidden",
        "transition-all duration-300 ease-out",
        "hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 hover:border-border/80",
        !formation.actif && "opacity-55 grayscale-[20%]"
      )}
    >
      {/* Gradient header with icon */}
      <div className={cn("relative px-4 pt-4 pb-3 bg-gradient-to-br", config.gradient)}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg shrink-0",
              "bg-card/80 backdrop-blur-sm shadow-sm border border-border/30"
            )}>
              <CategoryIcon className={cn("h-4.5 w-4.5", config.accent)} />
            </div>
            <div className="space-y-0.5">
              <span className="font-mono text-[10px] tracking-wider text-muted-foreground/80 uppercase">
                {formation.code}
              </span>
              {!formation.actif && (
                <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                  <EyeOff className="h-2.5 w-2.5" />
                  <span>Inactif</span>
                </div>
              )}
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn("text-[10px] shrink-0 font-medium border backdrop-blur-sm", typeInfo.class)}
          >
            {typeInfo.label}
          </Badge>
        </div>
      </div>

      <div className="flex flex-col flex-1 px-4 pb-4 pt-3 space-y-3">
        {/* Title */}
        <h3 className="text-[13px] font-semibold leading-snug line-clamp-2 min-h-[2.25rem] text-foreground">
          {formation.intitule}
        </h3>

        {/* Price & duration chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-muted/50 rounded-lg px-2.5 py-1.5">
            <Euro className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm font-bold tabular-nums">
              {formatPrix(formation.prix_ht)}
            </span>
          </div>
          {formation.remise_percent > 0 && (
            <Badge variant="secondary" className="text-[10px] py-0.5 bg-success/10 text-success border-0 font-semibold">
              <Percent className="h-2.5 w-2.5 mr-0.5" />
              -{formation.remise_percent}%
            </Badge>
          )}
          {formation.duree_heures > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground ml-auto bg-muted/30 rounded-lg px-2 py-1">
              <Clock className="h-3 w-3" />
              <span className="font-medium tabular-nums">{formation.duree_heures}h</span>
            </div>
          )}
        </div>

        {/* Description */}
        {formation.description && (
          <p className="text-[11px] text-muted-foreground/80 leading-relaxed line-clamp-2">
            {formation.description}
          </p>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Actions — slide up on hover */}
        <div className={cn(
          "flex gap-1.5 pt-3 border-t border-border/40",
          "sm:translate-y-1 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100",
          "transition-all duration-200"
        )}>
          {canDownloadProgramme && onDownloadProgramme && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-[11px] px-2 text-muted-foreground hover:text-foreground"
              onClick={() => onDownloadProgramme(formation)}
              title="Télécharger le programme PDF"
            >
              <Download className="h-3 w-3 mr-1" />
              PDF
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[11px] px-2 flex-1 text-muted-foreground hover:text-foreground"
            onClick={() => onEdit(formation)}
          >
            <Edit className="h-3 w-3 mr-1" />
            Modifier
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/60 hover:text-destructive hover:bg-destructive/10">
                <Trash2 className="h-3 w-3" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Supprimer cet article ?</AlertDialogTitle>
                <AlertDialogDescription>
                  L'article "{formation.intitule}" sera définitivement supprimé du catalogue.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(formation.id)}>
                  Supprimer
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
