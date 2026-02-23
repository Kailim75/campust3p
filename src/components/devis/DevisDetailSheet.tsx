import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Edit, 
  FileCheck, 
  Send, 
  Check, 
  XCircle, 
  User, 
  Calendar, 
  Euro,
  Phone,
  Mail,
  FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useDevisDetail, useUpdateDevis, type DevisStatut } from "@/hooks/useDevis";

interface DevisDetailSheetProps {
  devisId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (devis: any) => void;
  onConvert: (devisId: string) => void;
}

const statusConfig: Record<DevisStatut, { label: string; class: string }> = {
  brouillon: { label: "Brouillon", class: "bg-muted text-muted-foreground" },
  envoye: { label: "Envoyé", class: "bg-info/10 text-info" },
  accepte: { label: "Accepté", class: "bg-success text-success-foreground" },
  refuse: { label: "Refusé", class: "bg-destructive/10 text-destructive" },
  expire: { label: "Expiré", class: "bg-warning/10 text-warning" },
  converti: { label: "Converti", class: "bg-primary/10 text-primary" },
};

const financementLabels: Record<string, string> = {
  personnel: "Personnel",
  entreprise: "Entreprise",
  cpf: "CPF",
  opco: "OPCO",
};

export function DevisDetailSheet({
  devisId,
  open,
  onOpenChange,
  onEdit,
  onConvert,
}: DevisDetailSheetProps) {
  const { data: devis, isLoading } = useDevisDetail(devisId);
  const updateDevis = useUpdateDevis();

  const handleUpdateStatut = async (newStatut: DevisStatut) => {
    if (devisId) {
      await updateDevis.mutateAsync({ id: devisId, statut: newStatut });
    }
  };

  const totaux = devis?.lignes?.reduce(
    (acc, ligne) => ({
      ht: acc.ht + Number(ligne.montant_ht),
      tva: acc.tva + Number(ligne.montant_tva),
      ttc: acc.ttc + Number(ligne.montant_ttc),
    }),
    { ht: 0, tva: 0, ttc: 0 }
  ) || { ht: 0, tva: 0, ttc: 0 };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        {isLoading ? (
          <div className="space-y-4 p-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : !devis ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground">
            Devis non trouvé
          </div>
        ) : (
          <>
            <SheetHeader>
              <div className="flex items-center justify-between">
                <div>
                  <SheetTitle className="text-xl font-display">
                    {devis.numero_devis}
                  </SheetTitle>
                  <SheetDescription>
                    Créé le {format(new Date(devis.created_at), "dd MMMM yyyy", { locale: fr })}
                  </SheetDescription>
                </div>
                <Badge className={cn("text-sm", statusConfig[devis.statut]?.class)}>
                  {statusConfig[devis.statut]?.label}
                </Badge>
              </div>
            </SheetHeader>

            <div className="mt-6 space-y-6">
              {/* Actions */}
              {devis.statut !== "converti" && (
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => onEdit(devis)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Modifier
                  </Button>

                  {devis.statut === "brouillon" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUpdateStatut("envoye")}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Marquer envoyé
                    </Button>
                  )}

                  {devis.statut === "envoye" && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-success"
                        onClick={() => handleUpdateStatut("accepte")}
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Accepté
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive"
                        onClick={() => handleUpdateStatut("refuse")}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Refusé
                      </Button>
                    </>
                  )}

                  {devis.statut === "accepte" && (
                    <Button
                      size="sm"
                      onClick={() => onConvert(devis.id)}
                    >
                      <FileCheck className="h-4 w-4 mr-2" />
                      Convertir en facture
                    </Button>
                  )}
                </div>
              )}

              {devis.facture_id && (
                <div className="p-3 bg-primary/10 rounded-lg flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="text-sm">
                    Ce devis a été converti en facture
                  </span>
                </div>
              )}

              <Separator />

              {/* Client */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Client
                </h3>
                {devis.contact ? (
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <p className="font-medium">
                      {devis.contact.prenom} {devis.contact.nom}
                    </p>
                    {devis.contact.email && (
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Mail className="h-3 w-3" />
                        {devis.contact.email}
                      </p>
                    )}
                    {(devis.contact as any).telephone && (
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Phone className="h-3 w-3" />
                        {(devis.contact as any).telephone}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground">Client non trouvé</p>
                )}
              </div>

              {/* Infos */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Financement</p>
                  <p className="font-medium">{financementLabels[devis.type_financement]}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Validité</p>
                  <p className="font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {devis.date_validite
                      ? format(new Date(devis.date_validite), "dd/MM/yyyy")
                      : "—"}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Lignes */}
              <div>
                <h3 className="font-semibold mb-3">Détail du devis</h3>
                {devis.lignes && devis.lignes.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Qté</TableHead>
                        <TableHead className="text-right">P.U. HT</TableHead>
                        <TableHead className="text-right">Total TTC</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {devis.lignes.map((ligne) => (
                        <TableRow key={ligne.id}>
                          <TableCell>{ligne.description}</TableCell>
                          <TableCell className="text-right">{ligne.quantite}</TableCell>
                          <TableCell className="text-right">
                            {Number(ligne.prix_unitaire_ht).toLocaleString("fr-FR", {
                              minimumFractionDigits: 2,
                            })}€
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {Number(ligne.montant_ttc).toLocaleString("fr-FR", {
                              minimumFractionDigits: 2,
                            })}€
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-muted-foreground">Aucune ligne</p>
                )}

                {/* Totaux */}
                <div className="mt-4 flex justify-end">
                  <div className="w-64 space-y-2 p-4 bg-muted/50 rounded-lg">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span className="text-primary">
                        {totaux.ht.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}€
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">TVA non applicable — art. 293 B du CGI</p>
                  </div>
                </div>
              </div>

              {/* Commentaires */}
              {devis.commentaires && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold mb-2">Commentaires</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {devis.commentaires}
                    </p>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
