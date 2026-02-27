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

const categoryConfig: Record<string, { icon: typeof Car; accent: string; bg: string }> = {
  Taxi: { icon: Car, accent: "text-primary", bg: "bg-primary/6" },
  VTC: { icon: Car, accent: "text-success", bg: "bg-success/6" },
  VMDTR: { icon: Bike, accent: "text-info", bg: "bg-info/6" },
  Accompagnement: { icon: Briefcase, accent: "text-warning", bg: "bg-warning/6" },
  Autre: { icon: Package, accent: "text-muted-foreground", bg: "bg-muted/50" },
  Services: { icon: Package, accent: "text-muted-foreground", bg: "bg-muted/50" },
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
        "group relative flex flex-col rounded-xl border bg-card transition-all duration-200",
        "hover:shadow-md hover:border-border/80",
        !formation.actif && "opacity-50"
      )}
    >
      {/* Header strip with category color */}
      <div className={cn("h-1.5 rounded-t-xl", config.bg)} />

      <div className="flex flex-col flex-1 p-4 pt-3 space-y-3">
        {/* Top row: icon + code + type badge */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg shrink-0", config.bg)}>
              <CategoryIcon className={cn("h-4 w-4", config.accent)} />
            </div>
            <div>
              <span className="font-mono text-[11px] text-muted-foreground">{formation.code}</span>
              {!formation.actif && (
                <Badge variant="outline" className="ml-2 text-[10px] py-0 text-muted-foreground border-muted">
                  <EyeOff className="h-2.5 w-2.5 mr-0.5" />
                  Inactif
                </Badge>
              )}
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn("text-[10px] shrink-0 font-medium border", typeInfo.class)}
          >
            {typeInfo.label}
          </Badge>
        </div>

        {/* Title */}
        <h3 className="text-sm font-semibold leading-snug line-clamp-2 min-h-[2.5rem]">
          {formation.intitule}
        </h3>

        {/* Price & duration row */}
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-sm font-semibold">
            <Euro className="h-3.5 w-3.5 text-muted-foreground" />
            {formatPrix(formation.prix_ht)}
          </span>
          {formation.remise_percent > 0 && (
            <Badge variant="secondary" className="text-[10px] py-0 bg-success/10 text-success border-0">
              <Percent className="h-2.5 w-2.5 mr-0.5" />
              -{formation.remise_percent}%
            </Badge>
          )}
          {formation.duree_heures > 0 && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
              <Clock className="h-3 w-3" />
              {formation.duree_heures}h
            </span>
          )}
        </div>

        {/* Description */}
        {formation.description && (
          <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
            {formation.description}
          </p>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Actions — always visible on mobile, hover on desktop */}
        <div className="flex gap-1.5 pt-2 border-t border-border/50 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          {canDownloadProgramme && onDownloadProgramme && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs px-2"
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
            className="h-7 text-xs px-2 flex-1"
            onClick={() => onEdit(formation)}
          >
            <Edit className="h-3 w-3 mr-1" />
            Modifier
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
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
