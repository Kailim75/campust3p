import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { 
  Building2, Phone, Mail, MapPin, Calendar, Euro, Users, 
  TrendingUp, Pencil, Plus, Percent, UserPlus 
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { usePartners, usePartnerStatsById, usePartnerContacts, usePayPartnerCommission, type Partner, type PartnerType, type PartnerStatus, type PartnerRemunerationMode } from "@/hooks/usePartners";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

interface PartnerDetailSheetProps {
  partnerId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (partner: Partner) => void;
}

const TYPE_LABELS: Record<PartnerType, string> = {
  apporteur_affaires: "Apporteur d'affaires",
  auto_ecole: "Auto-école",
  entreprise: "Entreprise",
  organisme_formation: "Organisme de formation",
  prescripteur: "Prescripteur",
  autre: "Autre",
};

const STATUS_LABELS: Record<PartnerStatus, string> = {
  actif: "Actif",
  inactif: "Inactif",
  suspendu: "Suspendu",
};

const STATUS_COLORS: Record<PartnerStatus, string> = {
  actif: "bg-green-100 text-green-800",
  inactif: "bg-gray-100 text-gray-800",
  suspendu: "bg-red-100 text-red-800",
};

const REMUNERATION_LABELS: Record<PartnerRemunerationMode, string> = {
  commission: "Commission",
  forfait: "Forfait",
  aucun: "Aucune",
};

export function PartnerDetailSheet({ partnerId, open, onOpenChange, onEdit }: PartnerDetailSheetProps) {
  const { data: partners = [] } = usePartners();
  const { data: stats, isLoading: statsLoading } = usePartnerStatsById(partnerId || "");
  const { data: contacts = [], isLoading: contactsLoading } = usePartnerContacts(partnerId || "");
  const payCommission = usePayPartnerCommission();
  
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");

  const partner = partners.find((p) => p.id === partnerId);

  if (!partner) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handlePayCommission = async () => {
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) return;
    
    await payCommission.mutateAsync({
      partnerId: partner.id,
      amount,
    });
    setPaymentDialogOpen(false);
    setPaymentAmount("");
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader className="pb-4 border-b">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <SheetTitle className="text-xl">{partner.company_name}</SheetTitle>
                <div className="flex gap-2">
                  <Badge className={STATUS_COLORS[partner.statut_partenaire || "actif"]}>
                    {STATUS_LABELS[partner.statut_partenaire || "actif"]}
                  </Badge>
                  <Badge variant="outline">
                    {TYPE_LABELS[partner.type_partenaire || "autre"]}
                  </Badge>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => onEdit(partner)}>
                <Pencil className="h-4 w-4 mr-2" />
                Modifier
              </Button>
            </div>
          </SheetHeader>

          <Tabs defaultValue="resume" className="mt-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="resume">Résumé</TabsTrigger>
              <TabsTrigger value="apprenants">Apprenants</TabsTrigger>
              <TabsTrigger value="infos">Informations</TabsTrigger>
            </TabsList>

            <TabsContent value="resume" className="mt-4 space-y-4">
              {/* KPI Cards */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Apprenants</span>
                    </div>
                    <p className="text-2xl font-bold mt-1">
                      {statsLoading ? <Skeleton className="h-8 w-16" /> : stats?.nb_apprenants || 0}
                    </p>
                    {stats?.nb_apprenants_ce_mois ? (
                      <p className="text-xs text-green-600">+{stats.nb_apprenants_ce_mois} ce mois</p>
                    ) : null}
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">CA généré</span>
                    </div>
                    <p className="text-2xl font-bold mt-1">
                      {statsLoading ? <Skeleton className="h-8 w-24" /> : formatCurrency(stats?.ca_genere || 0)}
                    </p>
                    {stats?.ca_ce_mois ? (
                      <p className="text-xs text-green-600">+{formatCurrency(stats.ca_ce_mois)} ce mois</p>
                    ) : null}
                  </CardContent>
                </Card>
              </div>

              {/* Commission Card */}
              {partner.mode_remuneration !== "aucun" && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Euro className="h-4 w-4" />
                      Commissions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Mode</span>
                      <Badge variant="outline">
                        {REMUNERATION_LABELS[partner.mode_remuneration || "aucun"]}
                        {partner.mode_remuneration === "commission" && partner.taux_commission
                          ? ` (${partner.taux_commission}%)`
                          : ""}
                        {partner.mode_remuneration === "forfait" && partner.montant_forfait
                          ? ` (${formatCurrency(partner.montant_forfait)}/apprenant)`
                          : ""}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Commission calculée</span>
                      <span className="font-medium">
                        {statsLoading ? <Skeleton className="h-5 w-20" /> : formatCurrency(stats?.commission_calculee || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Déjà payé</span>
                      <span className="font-medium">{formatCurrency(partner.commission_payee || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="text-sm font-medium">Restant à payer</span>
                      <span className="font-bold text-orange-600">
                        {statsLoading ? <Skeleton className="h-5 w-20" /> : formatCurrency(stats?.commission_restante || 0)}
                      </span>
                    </div>
                    {(stats?.commission_restante || 0) > 0 && (
                      <Button 
                        className="w-full mt-2" 
                        variant="outline"
                        onClick={() => setPaymentDialogOpen(true)}
                      >
                        <Euro className="h-4 w-4 mr-2" />
                        Enregistrer un paiement
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Contract dates */}
              {(partner.date_debut_contrat || partner.date_fin_contrat) && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Contrat
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {partner.date_debut_contrat && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Début</span>
                        <span>{format(new Date(partner.date_debut_contrat), "dd/MM/yyyy", { locale: fr })}</span>
                      </div>
                    )}
                    {partner.date_fin_contrat && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Fin</span>
                        <span>{format(new Date(partner.date_fin_contrat), "dd/MM/yyyy", { locale: fr })}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="apprenants" className="mt-4">
              {contactsLoading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : contacts.length === 0 ? (
                <EmptyState
                  icon={UserPlus}
                  title="Aucun apprenant"
                  description="Aucun apprenant n'a été apporté par ce partenaire pour l'instant."
                />
              ) : (
                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Apprenant</TableHead>
                        <TableHead>Formation</TableHead>
                        <TableHead>Date apport</TableHead>
                        <TableHead>Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contacts.map((contact) => (
                        <TableRow key={contact.id}>
                          <TableCell className="font-medium">
                            {contact.prenom} {contact.nom}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{contact.formation || "-"}</Badge>
                          </TableCell>
                          <TableCell>
                            {contact.date_apport
                              ? format(new Date(contact.date_apport), "dd/MM/yyyy", { locale: fr })
                              : "-"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{contact.statut || "-"}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="infos" className="mt-4 space-y-4">
              <Card>
                <CardContent className="pt-4 space-y-3">
                  {partner.contact_name && (
                    <div className="flex items-center gap-3">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span>{partner.contact_name}</span>
                    </div>
                  )}
                  {partner.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a href={`tel:${partner.phone}`} className="text-primary hover:underline">
                        {partner.phone}
                      </a>
                    </div>
                  )}
                  {partner.email && (
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a href={`mailto:${partner.email}`} className="text-primary hover:underline">
                        {partner.email}
                      </a>
                    </div>
                  )}
                  {partner.address && (
                    <div className="flex items-center gap-3">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{partner.address}</span>
                    </div>
                  )}
                  {partner.zone_geographique && (
                    <div className="flex items-center gap-3">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Zone: {partner.zone_geographique}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {partner.notes && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{partner.notes}</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enregistrer un paiement de commission</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Montant du paiement (€)</Label>
              <Input
                id="amount"
                type="number"
                min={0}
                step={0.01}
                placeholder="Ex: 500"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Commission restante: {formatCurrency(stats?.commission_restante || 0)}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handlePayCommission}
              disabled={payCommission.isPending || !paymentAmount || parseFloat(paymentAmount) <= 0}
            >
              {payCommission.isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
