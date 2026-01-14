import { useState, useMemo } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  FileText, 
  MoreHorizontal, 
  Send, 
  Loader2, 
  Filter, 
  X, 
  Check, 
  XCircle,
  ArrowRight,
  Eye,
  Edit,
  Trash2,
  FileCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isPast } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  useDevis, 
  useDevisStats, 
  useUpdateDevis, 
  useDeleteDevis,
  useConvertDevisToFacture,
  type DevisStatut 
} from "@/hooks/useDevis";
import { DevisFormDialog } from "./DevisFormDialog";
import { DevisDetailSheet } from "./DevisDetailSheet";

const statusConfig: Record<DevisStatut, { label: string; class: string; icon?: any }> = {
  brouillon: { label: "Brouillon", class: "bg-muted text-muted-foreground" },
  envoye: { label: "Envoyé", class: "bg-info/10 text-info", icon: Send },
  accepte: { label: "Accepté", class: "bg-success text-success-foreground", icon: Check },
  refuse: { label: "Refusé", class: "bg-destructive/10 text-destructive", icon: XCircle },
  expire: { label: "Expiré", class: "bg-warning/10 text-warning" },
  converti: { label: "Converti", class: "bg-primary/10 text-primary", icon: ArrowRight },
};

const financementLabels: Record<string, { label: string; class: string }> = {
  personnel: { label: "Personnel", class: "bg-muted text-muted-foreground" },
  entreprise: { label: "Entreprise", class: "bg-info/10 text-info" },
  cpf: { label: "CPF", class: "bg-success/10 text-success" },
  opco: { label: "OPCO", class: "bg-primary/10 text-primary" },
};

export function DevisPage() {
  const [showDevisForm, setShowDevisForm] = useState(false);
  const [selectedDevisId, setSelectedDevisId] = useState<string | null>(null);
  const [editingDevis, setEditingDevis] = useState<any>(null);
  const [statutFilter, setStatutFilter] = useState<string>("all");
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [devisToConvert, setDevisToConvert] = useState<string | null>(null);

  const { data: devisList = [], isLoading } = useDevis();
  const { data: stats } = useDevisStats();
  const updateDevis = useUpdateDevis();
  const deleteDevis = useDeleteDevis();
  const convertToFacture = useConvertDevisToFacture();

  const filteredDevis = useMemo(() => {
    return devisList.filter((devis) => {
      if (statutFilter !== "all" && devis.statut !== statutFilter) {
        return false;
      }
      return true;
    });
  }, [devisList, statutFilter]);

  const hasActiveFilters = statutFilter !== "all";

  const clearFilters = () => {
    setStatutFilter("all");
  };

  const handleOpenDetail = (devisId: string) => {
    setSelectedDevisId(devisId);
  };

  const handleEdit = (devis: any) => {
    setEditingDevis(devis);
    setSelectedDevisId(null);
    setShowDevisForm(true);
  };

  const handleUpdateStatut = async (devisId: string, newStatut: DevisStatut) => {
    await updateDevis.mutateAsync({ id: devisId, statut: newStatut });
  };

  const handleConvertToFacture = (devisId: string) => {
    setDevisToConvert(devisId);
    setConvertDialogOpen(true);
  };

  const confirmConvert = async () => {
    if (devisToConvert) {
      await convertToFacture.mutateAsync(devisToConvert);
      setConvertDialogOpen(false);
      setDevisToConvert(null);
    }
  };

  const handleDelete = async (devisId: string) => {
    await deleteDevis.mutateAsync(devisId);
  };

  return (
    <div className="min-h-screen">
      <Header 
        title="Devis" 
        subtitle="Créez et gérez vos devis avant facturation"
        addLabel="Nouveau devis"
        onAddClick={() => {
          setEditingDevis(null);
          setShowDevisForm(true);
        }}
      />

      <main className="p-6 animate-fade-in">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="card-elevated p-4">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-2xl font-display font-bold">{stats?.total || 0}</p>
          </div>
          <div className="card-elevated p-4">
            <p className="text-sm text-muted-foreground">Envoyés</p>
            <p className="text-2xl font-display font-bold text-info">{stats?.envoye || 0}</p>
            <p className="text-xs text-muted-foreground">
              {(stats?.montantEnvoye || 0).toLocaleString("fr-FR")}€
            </p>
          </div>
          <div className="card-elevated p-4">
            <p className="text-sm text-muted-foreground">Acceptés</p>
            <p className="text-2xl font-display font-bold text-success">{stats?.accepte || 0}</p>
            <p className="text-xs text-muted-foreground">
              {(stats?.montantAccepte || 0).toLocaleString("fr-FR")}€
            </p>
          </div>
          <div className="card-elevated p-4">
            <p className="text-sm text-muted-foreground">Convertis</p>
            <p className="text-2xl font-display font-bold text-primary">{stats?.converti || 0}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="card-elevated p-4 mb-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="h-4 w-4" />
              <span className="font-medium">Filtres</span>
            </div>

            <Select value={statutFilter} onValueChange={setStatutFilter}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous statuts</SelectItem>
                {Object.entries(statusConfig).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

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

            <div className="ml-auto text-sm text-muted-foreground">
              {filteredDevis.length} devis
              {hasActiveFilters && ` sur ${devisList.length}`}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="card-elevated overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredDevis.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                {hasActiveFilters ? "Aucun devis ne correspond aux filtres" : "Aucun devis"}
              </p>
              {!hasActiveFilters && (
                <Button
                  variant="link"
                  className="mt-2"
                  onClick={() => {
                    setEditingDevis(null);
                    setShowDevisForm(true);
                  }}
                >
                  Créer un premier devis
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">N° Devis</TableHead>
                  <TableHead className="font-semibold">Client</TableHead>
                  <TableHead className="font-semibold">Financement</TableHead>
                  <TableHead className="font-semibold">Montant</TableHead>
                  <TableHead className="font-semibold">Statut</TableHead>
                  <TableHead className="font-semibold">Validité</TableHead>
                  <TableHead className="text-right font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDevis.map((devis) => {
                  const isExpired = devis.date_validite && isPast(new Date(devis.date_validite)) && devis.statut === "envoye";
                  
                  return (
                    <TableRow
                      key={devis.id}
                      className="table-row-hover cursor-pointer"
                      onClick={() => handleOpenDetail(devis.id)}
                    >
                      <TableCell className="font-mono text-sm">
                        {devis.numero_devis}
                      </TableCell>
                      <TableCell className="font-medium text-foreground">
                        {devis.contact
                          ? `${devis.contact.prenom} ${devis.contact.nom}`
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={cn("text-xs", financementLabels[devis.type_financement]?.class)}
                        >
                          {financementLabels[devis.type_financement]?.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {Number(devis.montant_total).toLocaleString("fr-FR", { minimumFractionDigits: 2 })}€
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("text-xs", statusConfig[devis.statut]?.class)}>
                          {statusConfig[devis.statut]?.label}
                        </Badge>
                        {isExpired && devis.statut !== "expire" && (
                          <Badge variant="outline" className="ml-1 text-xs text-warning">
                            Expiré
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {devis.date_validite
                          ? format(new Date(devis.date_validite), "dd/MM/yyyy", { locale: fr })
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
                              handleOpenDetail(devis.id);
                            }}>
                              <Eye className="h-4 w-4 mr-2" />
                              Voir détails
                            </DropdownMenuItem>
                            
                            {devis.statut !== "converti" && (
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(devis);
                              }}>
                                <Edit className="h-4 w-4 mr-2" />
                                Modifier
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuSeparator />

                            {devis.statut === "brouillon" && (
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateStatut(devis.id, "envoye");
                              }}>
                                <Send className="h-4 w-4 mr-2" />
                                Marquer envoyé
                              </DropdownMenuItem>
                            )}

                            {devis.statut === "envoye" && (
                              <>
                                <DropdownMenuItem onClick={(e) => {
                                  e.stopPropagation();
                                  handleUpdateStatut(devis.id, "accepte");
                                }}>
                                  <Check className="h-4 w-4 mr-2" />
                                  Marquer accepté
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => {
                                  e.stopPropagation();
                                  handleUpdateStatut(devis.id, "refuse");
                                }}>
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Marquer refusé
                                </DropdownMenuItem>
                              </>
                            )}

                            {devis.statut === "accepte" && (
                              <DropdownMenuItem 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleConvertToFacture(devis.id);
                                }}
                                className="text-primary"
                              >
                                <FileCheck className="h-4 w-4 mr-2" />
                                Convertir en facture
                              </DropdownMenuItem>
                            )}

                            {devis.statut !== "converti" && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(devis.id);
                                  }}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Supprimer
                                </DropdownMenuItem>
                              </>
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

      {/* Form Dialog */}
      <DevisFormDialog
        open={showDevisForm}
        onOpenChange={setShowDevisForm}
        devis={editingDevis}
      />

      {/* Detail Sheet */}
      <DevisDetailSheet
        devisId={selectedDevisId}
        open={!!selectedDevisId}
        onOpenChange={(open) => !open && setSelectedDevisId(null)}
        onEdit={handleEdit}
        onConvert={handleConvertToFacture}
      />

      {/* Convert Confirmation Dialog */}
      <AlertDialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Convertir en facture ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action va créer une nouvelle facture à partir de ce devis. 
              Le devis sera marqué comme "Converti" et ne pourra plus être modifié.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmConvert}
              disabled={convertToFacture.isPending}
            >
              {convertToFacture.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Conversion...
                </>
              ) : (
                "Convertir"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
