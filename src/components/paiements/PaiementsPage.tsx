import { useState, useMemo, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Euro, FileText, MoreHorizontal, Send, Filter, X, CalendarIcon, Download, FileSpreadsheet, TrendingUp, Zap, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, isAfter, isBefore, startOfDay, endOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { useFactures, useFacturesStats, FinancementType, FactureStatut, FactureWithDetails, useBulkEmitFactures } from "@/hooks/useFactures";
import { isHighRiskFacture, sortByRiskPriority } from "@/components/facturation/FacturationIntelligence";
import { FactureFormDialog } from "./FactureFormDialog";
import { FactureDetailSheet } from "./FactureDetailSheet";
import { PaiementFormDialog } from "./PaiementFormDialog";
import { ExportFECDialog } from "./ExportFECDialog";
import { toast } from "sonner";
// XLSX loaded dynamically for performance

const financementLabels: Record<FinancementType, { label: string; class: string }> = {
  personnel: { label: "Personnel", class: "bg-muted text-muted-foreground" },
  entreprise: { label: "Entreprise", class: "bg-info/10 text-info" },
  cpf: { label: "CPF", class: "bg-success/10 text-success" },
  opco: { label: "OPCO", class: "bg-primary/10 text-primary" },
};

const statusConfig: Record<FactureStatut, { label: string; class: string }> = {
  brouillon: { label: "Brouillon", class: "bg-muted text-muted-foreground" },
  emise: { label: "Émise", class: "bg-info/10 text-info" },
  payee: { label: "Payée", class: "bg-success text-success-foreground" },
  partiel: { label: "Partiel", class: "bg-warning text-warning-foreground" },
  impayee: { label: "Impayée", class: "bg-destructive text-destructive-foreground" },
  annulee: { label: "Annulée", class: "bg-muted text-muted-foreground" },
};

export function PaiementsPage() {
  const [showFactureForm, setShowFactureForm] = useState(false);
  const [selectedFactureId, setSelectedFactureId] = useState<string | null>(null);
  const [editingFacture, setEditingFacture] = useState<any>(null);
  const [paiementFactureId, setPaiementFactureId] = useState<string | null>(null);
  const [paiementMontantRestant, setPaiementMontantRestant] = useState(0);
  const [showFECDialog, setShowFECDialog] = useState(false);
  // Tab filter
  const [activeTab, setActiveTab] = useState<"tous" | "en_attente" | "soldes">("tous");

  // Filters state
  const [statutFilter, setStatutFilter] = useState<string>("all");
  const [financementFilter, setFinancementFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);

  const { data: factures = [], isLoading } = useFactures();
  const { data: stats } = useFacturesStats();
  const bulkEmit = useBulkEmitFactures();

  const brouillonCount = factures.filter(f => f.statut === "brouillon").length;

  const handleBulkEmit = () => {
    const brouillons = factures.filter(f => f.statut === "brouillon");
    if (brouillons.length === 0) {
      toast.info("Aucune facture brouillon à émettre");
      return;
    }
    if (!confirm(`Émettre ${brouillons.length} facture(s) brouillon ? Cette action est irréversible.`)) return;
    bulkEmit.mutate(brouillons.map(f => f.id));
  };

  // Filtered factures
  const filteredFactures = useMemo(() => {
    const filtered = factures.filter((facture) => {
      // Tab filter
      if (activeTab === "en_attente" && !["emise", "partiel", "impayee"].includes(facture.statut)) return false;
      if (activeTab === "soldes" && facture.statut !== "payee") return false;
      
      // Filter by status
      if (statutFilter !== "all" && facture.statut !== statutFilter) {
        return false;
      }
      // Filter by financement
      if (financementFilter !== "all" && facture.type_financement !== financementFilter) {
        return false;
      }
      // Filter by date range (using date_emission)
      if (dateFrom && facture.date_emission) {
        const emissionDate = new Date(facture.date_emission);
        if (isBefore(emissionDate, startOfDay(dateFrom))) {
          return false;
        }
      }
      if (dateTo && facture.date_emission) {
        const emissionDate = new Date(facture.date_emission);
        if (isAfter(emissionDate, endOfDay(dateTo))) {
          return false;
        }
      }
      return true;
    });

    // Auto-sort by risk priority when showing all
    if (activeTab === "tous" && statutFilter === "all") {
      filtered.sort(sortByRiskPriority);
    }

    return filtered;
  }, [factures, statutFilter, financementFilter, dateFrom, dateTo, activeTab]);

  const hasActiveFilters = statutFilter !== "all" || financementFilter !== "all" || dateFrom || dateTo;
  
  // Taux de recouvrement
  const tauxRecouvrement = stats && stats.total > 0 ? Math.round((stats.paye / stats.total) * 100) : 0;

  const clearFilters = () => {
    setStatutFilter("all");
    setFinancementFilter("all");
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  // Export comptable CSV/Excel
  const handleExportComptable = async (exportFormat: "csv" | "xlsx") => {
    if (filteredFactures.length === 0) {
      toast.error("Aucune facture à exporter");
      return;
    }

    const exportData = filteredFactures.map((facture) => ({
      "N° Facture": facture.numero_facture,
      "Date émission": facture.date_emission ? format(new Date(facture.date_emission), "dd/MM/yyyy") : "",
      "Date échéance": facture.date_echeance ? format(new Date(facture.date_echeance), "dd/MM/yyyy") : "",
      "Client": facture.contact ? `${facture.contact.prenom} ${facture.contact.nom}` : "",
      "Email": facture.contact?.email || "",
      "Téléphone": facture.contact?.telephone || "",
      "Formation": facture.session_inscription?.session?.catalogue_formation?.intitule || facture.session_inscription?.session?.nom || "",
      "Type financement": financementLabels[facture.type_financement].label,
      "Montant": Number(facture.montant_total).toFixed(2),
      "Montant payé": facture.total_paye.toFixed(2),
      "Reste à payer": (Number(facture.montant_total) - facture.total_paye).toFixed(2),
      "Statut": statusConfig[facture.statut].label,
      "Commentaires": facture.commentaires || "",
    }));

    if (exportFormat === "csv") {
      // Export CSV
      const headers = Object.keys(exportData[0]);
      const csvRows = [
        headers.join(";"),
        ...exportData.map(row => 
          headers.map(h => {
            const value = String(row[h as keyof typeof row] || "");
            // Escape quotes and wrap in quotes if contains semicolon
            if (value.includes(";") || value.includes('"') || value.includes("\n")) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(";")
        )
      ];
      const csvContent = "\uFEFF" + csvRows.join("\n"); // BOM for Excel UTF-8
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `export_factures_${format(new Date(), "yyyy-MM-dd")}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(`${filteredFactures.length} facture(s) exportée(s) en CSV`);
    } else {
      // Export XLSX - dynamic import for performance
      const XLSX = await import("xlsx");
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Factures");
      
      // Auto-size columns
      const maxWidths = Object.keys(exportData[0]).map((key) => {
        const maxLen = Math.max(
          key.length,
          ...exportData.map((row) => String(row[key as keyof typeof row] || "").length)
        );
        return { wch: Math.min(maxLen + 2, 50) };
      });
      worksheet["!cols"] = maxWidths;

      XLSX.writeFile(workbook, `export_factures_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
      toast.success(`${filteredFactures.length} facture(s) exportée(s) en Excel`);
    }
  };

  const handleOpenDetail = (factureId: string) => {
    setSelectedFactureId(factureId);
  };

  const handleEdit = (facture: any) => {
    setEditingFacture(facture);
    setSelectedFactureId(null);
    setShowFactureForm(true);
  };

  const handleAddPaiement = (factureId: string, montantRestant: number) => {
    setPaiementFactureId(factureId);
    setPaiementMontantRestant(montantRestant);
  };

  return (
    <div className="min-h-screen">
      <Header 
        title="Paiements & Facturation" 
        subtitle="Suivez les règlements et facturations"
        addLabel="Nouvelle facture"
        onAddClick={() => {
          setEditingFacture(null);
          setShowFactureForm(true);
        }}
      />

      <main className="p-6 animate-fade-in">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="card-elevated p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/10">
                <Euro className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">CA ce mois</p>
                <p className="text-2xl font-display font-bold text-foreground">
                  {(stats?.total || 0).toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}€
                </p>
              </div>
            </div>
          </div>
          <div className="card-elevated p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-success/10">
                <Euro className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Encaissé</p>
                <p className="text-2xl font-display font-bold text-success">
                  {(stats?.paye || 0).toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}€
                </p>
              </div>
            </div>
          </div>
          <div className="card-elevated p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-destructive/10">
                <Euro className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">En attente</p>
                <p className="text-2xl font-display font-bold text-destructive">
                  {(stats?.impaye || 0).toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}€
                </p>
              </div>
            </div>
          </div>
          <div className="card-elevated p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-info/10">
                <TrendingUp className="h-6 w-6 text-info" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Taux recouvrement</p>
                <p className={cn("text-2xl font-display font-bold", tauxRecouvrement >= 75 ? "text-success" : tauxRecouvrement >= 50 ? "text-accent" : "text-destructive")}>
                  {tauxRecouvrement}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="flex gap-1 mb-4 p-1 bg-muted rounded-xl w-fit">
          {([
            { key: "tous", label: "Tous", count: factures.length },
            { key: "en_attente", label: "En attente", count: factures.filter(f => ["emise", "partiel", "impayee"].includes(f.statut)).length },
            { key: "soldes", label: "Soldés", count: factures.filter(f => f.statut === "payee").length },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                activeTab === tab.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
              <span className="ml-1.5 text-xs opacity-60">({tab.count})</span>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="card-elevated p-4 mb-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="h-4 w-4" />
              <span className="font-medium">Filtres</span>
            </div>

            {/* Statut filter */}
            <Select value={statutFilter} onValueChange={setStatutFilter}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous statuts</SelectItem>
                <SelectItem value="brouillon">Brouillon</SelectItem>
                <SelectItem value="emise">Émise</SelectItem>
                <SelectItem value="payee">Payée</SelectItem>
                <SelectItem value="partiel">Partiel</SelectItem>
                <SelectItem value="impayee">Impayée</SelectItem>
                <SelectItem value="annulee">Annulée</SelectItem>
              </SelectContent>
            </Select>

            {/* Financement filter */}
            <Select value={financementFilter} onValueChange={setFinancementFilter}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="Financement" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous types</SelectItem>
                <SelectItem value="personnel">Personnel</SelectItem>
                <SelectItem value="entreprise">Entreprise</SelectItem>
                <SelectItem value="cpf">CPF</SelectItem>
                <SelectItem value="opco">OPCO</SelectItem>
              </SelectContent>
            </Select>

            {/* Date from */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "w-[130px] justify-start text-left font-normal h-9",
                    !dateFrom && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "Du"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateFrom}
                  onSelect={setDateFrom}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            {/* Date to */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "w-[130px] justify-start text-left font-normal h-9",
                    !dateTo && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateTo ? format(dateTo, "dd/MM/yyyy") : "Au"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateTo}
                  onSelect={setDateTo}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            {/* Clear filters */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-9 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4 mr-1" />
                Réinitialiser
              </Button>
            )}

            {/* Export button */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExportComptable("csv")}>
                  <FileText className="h-4 w-4 mr-2" />
                  Export CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportComptable("xlsx")}>
                  <FileText className="h-4 w-4 mr-2" />
                  Export Excel
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowFECDialog(true)}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export FEC (comptable)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Bulk emit brouillons */}
            {brouillonCount > 0 && (
              <Button
                variant="default"
                size="sm"
                className="h-9"
                onClick={handleBulkEmit}
                disabled={bulkEmit.isPending}
              >
                <Zap className="h-4 w-4 mr-2" />
                {bulkEmit.isPending ? "Émission..." : `Émettre ${brouillonCount} brouillon${brouillonCount > 1 ? "s" : ""}`}
              </Button>
            )}

            {/* Results count */}
            <div className="ml-auto text-sm text-muted-foreground">
              {filteredFactures.length} facture{filteredFactures.length !== 1 ? "s" : ""}
              {hasActiveFilters && ` sur ${factures.length}`}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="card-elevated overflow-hidden">
          {isLoading ? (
            <div className="space-y-4 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-8 ml-auto rounded" />
                </div>
              ))}
            </div>
          ) : filteredFactures.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                {hasActiveFilters ? "Aucune facture ne correspond aux filtres" : "Aucune facture"}
              </p>
              {hasActiveFilters ? (
                <Button variant="link" className="mt-2" onClick={clearFilters}>
                  Réinitialiser les filtres
                </Button>
              ) : (
                <Button
                  variant="link"
                  className="mt-2"
                  onClick={() => {
                    setEditingFacture(null);
                    setShowFactureForm(true);
                  }}
                >
                  Créer une première facture
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">N° Facture</TableHead>
                  <TableHead className="font-semibold">Stagiaire</TableHead>
                  <TableHead className="font-semibold">Formation</TableHead>
                  <TableHead className="font-semibold">Financement</TableHead>
                  <TableHead className="font-semibold">Montant</TableHead>
                  <TableHead className="font-semibold">Statut</TableHead>
                  <TableHead className="font-semibold">Échéance</TableHead>
                  <TableHead className="text-right font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFactures.map((facture) => {
                  const paidPercentage = (facture.total_paye / Number(facture.montant_total)) * 100;
                  const montantRestant = Number(facture.montant_total) - facture.total_paye;
                  
                  return (
                    <TableRow
                      key={facture.id}
                      className="table-row-hover cursor-pointer"
                      onClick={() => handleOpenDetail(facture.id)}
                    >
                      <TableCell className="font-mono text-sm">
                        {facture.numero_facture}
                      </TableCell>
                      <TableCell className="font-medium text-foreground">
                        {facture.contact
                          ? `${facture.contact.prenom} ${facture.contact.nom}`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {facture.session_inscription?.session?.catalogue_formation?.intitule || facture.session_inscription?.session?.nom || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={cn("text-xs", financementLabels[facture.type_financement].class)}
                        >
                          {financementLabels[facture.type_financement].label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium">
                            {facture.total_paye.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}€ / {Number(facture.montant_total).toLocaleString("fr-FR", { minimumFractionDigits: 2 })}€
                          </p>
                          <div className="h-1.5 w-24 bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all",
                                paidPercentage >= 100 ? "bg-success" : paidPercentage > 0 ? "bg-warning" : "bg-destructive"
                              )}
                              style={{ width: `${Math.min(paidPercentage, 100)}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Badge className={cn("text-xs", statusConfig[facture.statut].class)}>
                            {statusConfig[facture.statut].label}
                          </Badge>
                          {isHighRiskFacture(facture) && (
                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0 gap-0.5">
                              <AlertTriangle className="h-2.5 w-2.5" />
                              Risque
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {facture.date_echeance
                          ? format(new Date(facture.date_echeance), "dd/MM/yyyy", { locale: fr })
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDetail(facture.id);
                            }}>
                              <FileText className="h-4 w-4 mr-2" />
                              Voir facture
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={async (e) => {
                              e.stopPropagation();
                              if (!facture.contact?.email) {
                                toast.error("Aucun email pour ce contact");
                                return;
                              }
                              toast.loading("Envoi de la relance...", { id: "relance-" + facture.id });
                              try {
                                const contactName = `${facture.contact.prenom} ${facture.contact.nom}`;
                                const montantDu = montantRestant.toLocaleString("fr-FR", { minimumFractionDigits: 2 });
                                const dateEcheance = facture.date_echeance
                                  ? format(new Date(facture.date_echeance), "dd/MM/yyyy", { locale: fr })
                                  : "non définie";
                                const subject = `Relance paiement - Facture ${facture.numero_facture}`;
                                const html = `
                                  <p>Bonjour ${facture.contact.prenom},</p>
                                  <p>Nous nous permettons de vous rappeler que la facture <strong>${facture.numero_facture}</strong> d'un montant restant dû de <strong>${montantDu}€</strong> (échéance : ${dateEcheance}) est en attente de règlement.</p>
                                  <p>Nous vous serions reconnaissants de bien vouloir procéder au paiement dans les meilleurs délais.</p>
                                  <p>Si le règlement a déjà été effectué, veuillez ne pas tenir compte de ce message.</p>
                                  <p>Cordialement,<br/>L'équipe Ecole T3P</p>
                                `;
                                const { data, error } = await supabase.functions.invoke("send-automated-emails", {
                                  body: {
                                    type: "direct_email",
                                    to: facture.contact.email,
                                    recipientName: contactName,
                                    subject,
                                    html,
                                    contactId: facture.contact_id,
                                    factureId: facture.id,
                                  },
                                });
                                if (error) throw error;
                                if (data?.error) throw new Error(data.error);
                                toast.success("Relance envoyée à " + facture.contact.email, { id: "relance-" + facture.id });
                              } catch (err: any) {
                                console.error("Erreur envoi relance:", err);
                                toast.error("Erreur lors de l'envoi de la relance: " + (err.message || "Erreur inconnue"), { id: "relance-" + facture.id });
                              }
                            }}>
                              <Send className="h-4 w-4 mr-2" />
                              Envoyer relance
                            </DropdownMenuItem>
                            {montantRestant > 0 && (
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                handleAddPaiement(facture.id, montantRestant);
                              }}>
                                <Euro className="h-4 w-4 mr-2" />
                                Enregistrer paiement
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </main>

      <FactureFormDialog
        open={showFactureForm}
        onOpenChange={setShowFactureForm}
        facture={editingFacture}
      />

      <FactureDetailSheet
        factureId={selectedFactureId}
        open={!!selectedFactureId}
        onOpenChange={(open) => !open && setSelectedFactureId(null)}
        onEdit={() => {
          const facture = factures.find((f) => f.id === selectedFactureId);
          if (facture) handleEdit(facture);
        }}
      />

      {paiementFactureId && (
        <PaiementFormDialog
          open={!!paiementFactureId}
          onOpenChange={(open) => !open && setPaiementFactureId(null)}
          factureId={paiementFactureId}
          montantRestant={paiementMontantRestant}
        />
      )}

      <ExportFECDialog
        open={showFECDialog}
        onOpenChange={setShowFECDialog}
      />
    </div>
  );
}
