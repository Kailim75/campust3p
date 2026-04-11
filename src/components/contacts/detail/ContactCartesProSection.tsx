import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { CreditCard, Plus, Pencil, Trash2, Calendar, ShieldAlert, Clock3, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  useCartesProfessionnelles,
  useCreateCartePro,
  useUpdateCartePro,
  useDeleteCartePro,
  type CarteProfessionnelle,
  type CarteProInsert,
} from "@/hooks/useCartesProfessionnelles";

interface ContactCartesProSectionProps {
  contactId: string;
}

const TYPE_CARTE_OPTIONS = [
  { value: "taxi", label: "Taxi" },
  { value: "vtc", label: "VTC" },
  { value: "vmdtr", label: "VMDTR" },
];

const STATUT_OPTIONS = [
  { value: "en_attente", label: "En attente" },
  { value: "en_cours", label: "En cours" },
  { value: "obtenue", label: "Obtenue" },
  { value: "expiree", label: "Expirée" },
  { value: "annulee", label: "Annulée" },
];

const statutConfig: Record<string, { label: string; class: string }> = {
  en_attente: { label: "En attente", class: "bg-muted text-muted-foreground" },
  en_cours: { label: "En cours", class: "bg-info/10 text-info" },
  obtenue: { label: "Obtenue", class: "bg-success text-success-foreground" },
  expiree: { label: "Expirée", class: "bg-destructive/10 text-destructive" },
  annulee: { label: "Annulée", class: "bg-muted text-muted-foreground" },
};

interface CarteFormData {
  type_carte: string;
  numero_carte: string;
  numero_dossier: string;
  prefecture: string;
  date_demande: string;
  date_obtention: string;
  date_expiration: string;
  statut: string;
  notes: string;
}

const emptyForm: CarteFormData = {
  type_carte: "taxi",
  numero_carte: "",
  numero_dossier: "",
  prefecture: "",
  date_demande: "",
  date_obtention: "",
  date_expiration: "",
  statut: "en_attente",
  notes: "",
};

export function ContactCartesProSection({ contactId }: ContactCartesProSectionProps) {
  const { data: cartes = [], isLoading } = useCartesProfessionnelles(contactId);
  const createCarte = useCreateCartePro();
  const updateCarte = useUpdateCartePro();
  const deleteCarte = useDeleteCartePro();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCarte, setEditingCarte] = useState<CarteProfessionnelle | null>(null);
  const [form, setForm] = useState<CarteFormData>(emptyForm);

  const openCreate = () => {
    setEditingCarte(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (carte: CarteProfessionnelle) => {
    setEditingCarte(carte);
    setForm({
      type_carte: carte.type_carte,
      numero_carte: carte.numero_carte || "",
      numero_dossier: carte.numero_dossier || "",
      prefecture: carte.prefecture || "",
      date_demande: carte.date_demande || "",
      date_obtention: carte.date_obtention || "",
      date_expiration: carte.date_expiration || "",
      statut: carte.statut,
      notes: carte.notes || "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (editingCarte) {
      await updateCarte.mutateAsync({
        id: editingCarte.id,
        contactId,
        type_carte: form.type_carte,
        numero_carte: form.numero_carte || null,
        numero_dossier: form.numero_dossier || null,
        prefecture: form.prefecture || null,
        date_demande: form.date_demande || null,
        date_obtention: form.date_obtention || null,
        date_expiration: form.date_expiration || null,
        statut: form.statut,
        notes: form.notes || null,
        formation_type: form.type_carte,
      });
    } else {
      await createCarte.mutateAsync({
        contact_id: contactId,
        type_carte: form.type_carte,
        numero_carte: form.numero_carte || null,
        numero_dossier: form.numero_dossier || null,
        prefecture: form.prefecture || null,
        date_demande: form.date_demande || null,
        date_obtention: form.date_obtention || null,
        date_expiration: form.date_expiration || null,
        statut: form.statut,
        notes: form.notes || null,
        formation_type: form.type_carte,
      } as CarteProInsert);
    }
    setDialogOpen(false);
  };

  const handleDelete = (carteId: string) => {
    deleteCarte.mutate({ id: carteId, contactId });
  };

  const cartesAvecStatut = cartes.map((carte) => {
    const isExpired = Boolean(carte.date_expiration && new Date(carte.date_expiration) < new Date());
    const normalizedStatus = isExpired && carte.statut === "obtenue" ? "expiree" : carte.statut;
    return { ...carte, isExpired, normalizedStatus };
  });

  const obtainedCount = cartesAvecStatut.filter((carte) => carte.normalizedStatus === "obtenue").length;
  const pendingCount = cartesAvecStatut.filter((carte) => carte.normalizedStatus === "en_attente" || carte.normalizedStatus === "en_cours").length;
  const expiredCount = cartesAvecStatut.filter((carte) => carte.normalizedStatus === "expiree").length;
  const dossierCount = cartesAvecStatut.filter((carte) => carte.numero_dossier).length;

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Card className="border-dashed">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                <p className="font-medium">Cartes professionnelles</p>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Suis ici l’avancement des demandes, les cartes obtenues et les échéances à renouveler.
              </p>
            </div>
            <Button variant="outline" size="sm" className="gap-1" onClick={openCreate}>
              <Plus className="h-3.5 w-3.5" />
              Ajouter
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-lg border bg-muted/30 px-3 py-3">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="mt-1 text-lg font-semibold">{cartes.length}</p>
            </div>
            <div className="rounded-lg border bg-muted/30 px-3 py-3">
              <p className="text-xs text-muted-foreground">Obtenues</p>
              <p className="mt-1 text-lg font-semibold">{obtainedCount}</p>
            </div>
            <div className="rounded-lg border bg-muted/30 px-3 py-3">
              <p className="text-xs text-muted-foreground">En cours</p>
              <p className="mt-1 text-lg font-semibold">{pendingCount}</p>
            </div>
            <div className="rounded-lg border bg-muted/30 px-3 py-3">
              <p className="text-xs text-muted-foreground">Dossiers renseignés</p>
              <p className="mt-1 text-lg font-semibold">{dossierCount}</p>
            </div>
          </div>

          {expiredCount > 0 && (
            <div className="rounded-lg border border-warning/20 bg-warning/5 px-3 py-3 text-sm">
              <div className="flex items-center gap-2 font-medium">
                <ShieldAlert className="h-4 w-4 text-warning" />
                Vigilance cartes pro
              </div>
              <p className="mt-1 text-muted-foreground">
                {expiredCount} carte(s) sont expirées ou à requalifier.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {cartes.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            <CreditCard className="h-6 w-6 mx-auto mb-1.5 opacity-40" />
            <p className="text-sm font-medium">Aucune carte professionnelle</p>
            <p className="text-xs mt-1">Ajoute une demande ou une carte obtenue pour commencer le suivi préfectoral.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {cartesAvecStatut.map((carte) => {
            const config = statutConfig[carte.normalizedStatus] || statutConfig.en_attente;

            return (
              <div key={carte.id} className="p-3 border rounded-lg space-y-2 group bg-card">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs font-semibold uppercase">
                      {carte.type_carte}
                    </Badge>
                    <Badge variant="outline" className={cn("text-xs", config.class)}>
                      {config.label}
                    </Badge>
                  </div>
                  <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(carte)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Supprimer cette carte ?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Cette action est irréversible.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(carte.id)}>
                            Supprimer
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                {carte.numero_carte && (
                  <p className="text-sm font-mono font-medium">
                    N° {carte.numero_carte}
                    {carte.prefecture && <span className="text-muted-foreground"> ({carte.prefecture})</span>}
                  </p>
                )}

                {carte.numero_dossier && (
                  <p className="text-xs text-muted-foreground">Dossier : {carte.numero_dossier}</p>
                )}

                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  {carte.date_demande && (
                    <span className="flex items-center gap-1">
                      <Clock3 className="h-3 w-3" />
                      Demandée le {format(new Date(carte.date_demande), "dd/MM/yyyy")}
                    </span>
                  )}
                  {carte.date_obtention && (
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Obtenue {format(new Date(carte.date_obtention), "dd/MM/yyyy")}
                    </span>
                  )}
                  {carte.date_expiration && (
                    <span className={cn("flex items-center gap-1", carte.isExpired && "text-destructive font-medium")}>
                      <Calendar className="h-3 w-3" />
                      {carte.isExpired ? "Expirée" : "Expire"} {format(new Date(carte.date_expiration), "dd/MM/yyyy")}
                    </span>
                  )}
                </div>

                {(carte.prefecture || carte.notes) && (
                  <div className="space-y-1">
                    {carte.prefecture && (
                      <p className="text-xs text-muted-foreground">Préfecture : {carte.prefecture}</p>
                    )}
                    {carte.notes && (
                      <p className="text-xs text-muted-foreground">{carte.notes}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCarte ? "Modifier la carte" : "Ajouter une carte professionnelle"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Type de carte *</Label>
                <Select value={form.type_carte} onValueChange={(v) => setForm({ ...form, type_carte: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TYPE_CARTE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Statut</Label>
                <Select value={form.statut} onValueChange={(v) => setForm({ ...form, statut: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">N° carte</Label>
                <Input
                  value={form.numero_carte}
                  onChange={(e) => setForm({ ...form, numero_carte: e.target.value })}
                  placeholder="T-75-2026-..."
                />
              </div>
              <div>
                <Label className="text-xs">N° dossier</Label>
                <Input
                  value={form.numero_dossier}
                  onChange={(e) => setForm({ ...form, numero_dossier: e.target.value })}
                  placeholder="N° dossier"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Préfecture</Label>
              <Input
                value={form.prefecture}
                onChange={(e) => setForm({ ...form, prefecture: e.target.value })}
                placeholder="Ex: Paris"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Date demande</Label>
                <Input type="date" value={form.date_demande} onChange={(e) => setForm({ ...form, date_demande: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Date obtention</Label>
                <Input type="date" value={form.date_obtention} onChange={(e) => setForm({ ...form, date_obtention: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Date expiration</Label>
                <Input type="date" value={form.date_expiration} onChange={(e) => setForm({ ...form, date_expiration: e.target.value })} />
              </div>
            </div>

            <div>
              <Label className="text-xs">Notes</Label>
              <Input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Notes..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button
              onClick={handleSubmit}
              disabled={createCarte.isPending || updateCarte.isPending}
            >
              {editingCarte ? "Enregistrer" : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
