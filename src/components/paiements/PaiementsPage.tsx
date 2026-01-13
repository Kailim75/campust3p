import { useState } from "react";
import { Header } from "@/components/layout/Header";
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
import { Euro, FileText, MoreHorizontal, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useFactures, useFacturesStats, FinancementType, FactureStatut } from "@/hooks/useFactures";
import { FactureFormDialog } from "./FactureFormDialog";
import { FactureDetailSheet } from "./FactureDetailSheet";
import { PaiementFormDialog } from "./PaiementFormDialog";

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

  const { data: factures = [], isLoading } = useFactures();
  const { data: stats } = useFacturesStats();

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="card-elevated p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/10">
                <Euro className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total facturé</p>
                <p className="text-2xl font-display font-bold text-foreground">
                  {(stats?.total || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2 })}€
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
                  {(stats?.paye || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2 })}€
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
                  {(stats?.impaye || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2 })}€
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="card-elevated overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : factures.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Aucune facture</p>
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
                {factures.map((facture) => {
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
                        {facture.session_inscription?.session?.nom || "—"}
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
                        <Badge className={cn("text-xs", statusConfig[facture.statut].class)}>
                          {statusConfig[facture.statut].label}
                        </Badge>
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
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              // TODO: implement reminder
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
    </div>
  );
}
