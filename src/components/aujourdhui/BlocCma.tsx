import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FileCheck, FileDown, Mail, ExternalLink, Filter, CheckCircle2, ListChecks, Bot, CheckSquare } from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { CMA_DOC_LABELS } from "@/lib/cma-constants";
import { exportToExcel } from "@/hooks/useExportData";
import { isHandledToday } from "@/lib/aujourdhui-actions";
import { UrgencyDot, LastActionLine, MarkDoneBtn, PostponeBtn } from "./AujourdhuiShared";
import type { BlocSharedProps, CmaFilter } from "./aujourdhui-types";
import { CMA_KEYWORDS } from "./aujourdhui-types";

const CMA_INITIAL_LIMIT = 5;

interface BlocCmaProps extends BlocSharedProps {
  allCmaFiltered: any[];
  cmaItems: any[];
  cmaHiddenCount: number;
  cmaExpanded: boolean;
  setCmaExpanded: (v: boolean) => void;
  cmaFilter: CmaFilter;
  setCmaFilter: (v: CmaFilter) => void;
  cmaCountAll: number;
  cmaCountDocs: number;
  cmaCountRejete: number;
  cmaCountEnCours: number;
  bulkCmaSelected: Set<string>;
  toggleBulkCma: (id: string) => void;
  toggleBulkCmaVisible: (items: any[]) => void;
  bulkProcessing: boolean;
  handleBulkCmaRelance: (items: any[]) => void;
  handleBulkCmaDone: (items: any[]) => void;
  handleCmaRelanceDocs: (item: any) => void;
  handleCmaWhatsApp: (item: any) => void;
  isCmaRelancedToday: (contactId: string) => boolean;
  postponeAction: (contactId: string, blocLabel: string, targetDate: string) => void;
}

export function BlocCma({
  allCmaFiltered, cmaItems, cmaHiddenCount, cmaExpanded, setCmaExpanded,
  cmaFilter, setCmaFilter, cmaCountAll, cmaCountDocs, cmaCountRejete, cmaCountEnCours,
  bulkCmaSelected, toggleBulkCma, toggleBulkCmaVisible, bulkProcessing, handleBulkCmaRelance,
  handleBulkCmaDone, handleCmaRelanceDocs, handleCmaWhatsApp, isCmaRelancedToday,
  postponeAction, todayNotes, recentNotes, openContact, markDone,
}: BlocCmaProps) {
  const CMA_FILTER_OPTIONS: { value: CmaFilter; label: string; count: number }[] = [
    { value: "all", label: "Tous", count: cmaCountAll },
    { value: "docs_manquants", label: "Docs manquants", count: cmaCountDocs },
    { value: "rejete", label: "Rejeté", count: cmaCountRejete },
    { value: "en_cours", label: "En cours", count: cmaCountEnCours },
  ];
  const allVisibleSelected = cmaItems.length > 0 && cmaItems.every((item) => bulkCmaSelected.has(item.id));

  const URGENCY_EXPORT_LABELS: Record<string, string> = {
    elevee: "Élevée",
    moyenne: "Moyenne",
    faible: "Faible",
  };

  const handleExportCma = async () => {
    const rows = allCmaFiltered.map((item) => ({
      "Prénom": item.prenom,
      "Nom": item.nom,
      "Formation": item.formation || "",
      "Dossier": item.dossierShortLabel || "CMA",
      "Pièces reçues": `${item.docCount}/${item.requiredDocCount || 5}`,
      "Pièces manquantes": (item.missingDocs || [])
        .map((d: string) => CMA_DOC_LABELS[d] || d)
        .join(", "),
      "Urgence": URGENCY_EXPORT_LABELS[item.urgency?.level] || "",
      "Email": item.email || "",
      "Téléphone": item.telephone || "",
    }));
    await exportToExcel(rows, { filename: "dossiers_cma_incomplets", sheetName: "Dossiers CMA" });
    if (rows.length > 0) {
      toast.success(`${rows.length} dossier(s) exporté(s)`);
    }
  };

  return (
    <Card className="p-0 overflow-hidden">
      <div className="px-5 py-4 border-b bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <FileCheck className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Dossiers à traiter</h3>
            <p className="text-[11px] text-muted-foreground">{cmaCountAll} dossier{cmaCountAll > 1 ? "s" : ""} incomplet{cmaCountAll > 1 ? "s" : ""}</p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 flex-wrap">
          {allCmaFiltered.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-[11px] gap-1"
              onClick={handleExportCma}
            >
              <FileDown className="h-3 w-3" />
              Exporter
            </Button>
          )}
          {cmaItems.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-[11px] gap-1"
              disabled={bulkProcessing}
              onClick={() => toggleBulkCmaVisible(cmaItems)}
            >
              <CheckSquare className="h-3 w-3" />
              {allVisibleSelected ? "Désélectionner" : "Tout sélectionner"}
            </Button>
          )}
          {bulkCmaSelected.size > 0 && (
            <div className="flex items-center justify-end gap-1.5 flex-wrap">
              <Button
                size="sm" variant="default" className="h-7 text-[11px] gap-1"
                disabled={bulkProcessing}
                onClick={() => handleBulkCmaRelance(cmaItems)}
              >
                <ListChecks className="h-3 w-3" />
                Relancer {bulkCmaSelected.size}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-[11px] gap-1 text-success border-success/25 bg-success/5 hover:bg-success/10 hover:text-success"
                disabled={bulkProcessing}
                onClick={() => handleBulkCmaDone(allCmaFiltered)}
              >
                <CheckCircle2 className="h-3 w-3" />
                Traiter {bulkCmaSelected.size}
              </Button>
              {bulkCmaSelected.size > 10 && (
                <span className="text-[11px] text-warning font-medium">⚠️ {bulkCmaSelected.size} dest.</span>
              )}
            </div>
          )}
          <Badge variant="outline" className="text-xs bg-primary/10 text-primary">{cmaCountAll}</Badge>
        </div>
      </div>

      {/* CMA sub-filters */}
      <div className="px-5 py-2 border-b bg-muted/10 flex items-center gap-1 overflow-x-auto">
        <Filter className="h-3 w-3 text-muted-foreground shrink-0 mr-1" />
        {CMA_FILTER_OPTIONS.map(opt => (
          <Button
            key={opt.value}
            variant={cmaFilter === opt.value ? "default" : "ghost"}
            size="sm"
            className="h-6 text-[11px] px-2 gap-1 shrink-0"
            onClick={() => setCmaFilter(opt.value)}
          >
            {opt.label}
            <span className="opacity-60">({opt.count})</span>
          </Button>
        ))}
      </div>

      <div className="divide-y max-h-80 overflow-y-auto">
        {cmaItems.length === 0 ? (
          <div className="p-5 text-center text-muted-foreground text-xs">
            <CheckCircle2 className="h-6 w-6 mx-auto mb-1.5 text-success/50" />
            {cmaFilter === "all" ? "Tous les dossiers sont complets" : "Aucun dans cette catégorie"}
          </div>
        ) : cmaItems.map((item) => {
          const relancedToday = isCmaRelancedToday(item.id);
          return (
            <div key={item.id} className="px-5 py-3 hover:bg-muted/20 transition-colors">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={bulkCmaSelected.has(item.id)}
                    onCheckedChange={() => toggleBulkCma(item.id)}
                    className="h-3.5 w-3.5"
                  />
                  <UrgencyDot urgency={item.urgency} />
                  <button onClick={() => openContact(item.id)} className="text-sm font-medium text-foreground hover:text-primary transition-colors flex items-center gap-1">
                    {item.prenom} {item.nom}
                    <ExternalLink className="h-3 w-3 opacity-40" />
                  </button>
                </div>
                <div className="flex items-center gap-1.5">
                  {item.formation && <Badge variant="outline" className="text-[11px]">{item.formation}</Badge>}
                  {item.dossierShortLabel && <Badge variant="outline" className="text-[11px] bg-primary/5 text-primary">{item.dossierShortLabel}</Badge>}
                  <Badge variant="outline" className="text-[11px] bg-muted text-muted-foreground">
                    {item.docCount}/{item.requiredDocCount || 5}
                  </Badge>
                </div>
              </div>
              <div className="flex flex-wrap gap-1 mb-2 pl-8">
                {item.missingDocs.map((d: string) => (
                  <Badge key={d} variant="outline" className="text-[11px] bg-destructive/10 text-destructive border-destructive/20">
                    ✗ {CMA_DOC_LABELS[d] || d}
                  </Badge>
                ))}
              </div>
              <div className="pl-8">
                {item.lastCmaNote ? (
                  <div className="flex items-center gap-1.5 mb-2">
                    <Bot className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[11px] text-muted-foreground">
                      Dernière relance : {format(parseISO(item.lastCmaNote.created_at), "HH:mm", { locale: fr })}
                    </span>
                  </div>
                ) : (
                  <LastActionLine todayNotes={todayNotes} recentNotes={recentNotes} contactId={item.id} />
                )}
              </div>
              <div className="flex gap-1.5 pl-8">
                {item.email && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <Button
                            size="sm" variant="outline" className="h-7 text-[11px]"
                            disabled={relancedToday}
                            onClick={() => handleCmaRelanceDocs(item)}
                          >
                            <Mail className="h-3 w-3 mr-1" /> Relance docs
                          </Button>
                        </span>
                      </TooltipTrigger>
                      {relancedToday && (
                        <TooltipContent><p>Déjà relancé aujourd'hui</p></TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                )}
                {item.telephone && (
                  <Button size="sm" variant="ghost" className="h-7 text-[11px] text-success" onClick={() => handleCmaWhatsApp(item)}>
                    <SiWhatsapp className="h-3 w-3 mr-1" /> WhatsApp
                  </Button>
                )}
                <MarkDoneBtn contactId={item.id} bloc="CMA" markDone={markDone} label="Dossier traité" />
                <PostponeBtn contactId={item.id} bloc="CMA" postponeAction={postponeAction} />
              </div>
            </div>
          );
        })}
      </div>
      {cmaHiddenCount > 0 && (
        <div className="px-5 py-3 border-t bg-muted/10">
          <Button
            variant="ghost" size="sm"
            className="w-full text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setCmaExpanded(true)}
          >
            Afficher {cmaHiddenCount} autre{cmaHiddenCount > 1 ? 's' : ''} dossier{cmaHiddenCount > 1 ? 's' : ''}
          </Button>
        </div>
      )}
      {cmaExpanded && allCmaFiltered.length > CMA_INITIAL_LIMIT && (
        <div className="px-5 py-2 border-t bg-muted/10">
          <Button
            variant="ghost" size="sm"
            className="w-full text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setCmaExpanded(false)}
          >
            Réduire
          </Button>
        </div>
      )}
    </Card>
  );
}
