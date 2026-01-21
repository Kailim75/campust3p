import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Building2,
  Phone,
  Mail,
  Trash2,
  Link as LinkIcon,
} from "lucide-react";
import {
  useContactPartners,
  useAssociatePartner,
  useDissociatePartner,
  usePartners,
  type PartnerCategory,
} from "@/hooks/usePartners";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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

const CATEGORY_LABELS: Record<PartnerCategory, string> = {
  assurance: "Assurance",
  comptable: "Comptable",
  medecin: "Médecin",
  banque: "Banque",
  vehicule: "Véhicule",
  autre: "Autre",
};

const CATEGORY_COLORS: Record<PartnerCategory, string> = {
  assurance: "bg-blue-100 text-blue-800",
  comptable: "bg-green-100 text-green-800",
  medecin: "bg-red-100 text-red-800",
  banque: "bg-purple-100 text-purple-800",
  vehicule: "bg-orange-100 text-orange-800",
  autre: "bg-gray-100 text-gray-800",
};

interface ContactPartnersTabProps {
  contactId: string;
}

export function ContactPartnersTab({ contactId }: ContactPartnersTabProps) {
  const { data: contactPartners = [], isLoading } = useContactPartners(contactId);
  const { data: allPartners = [] } = usePartners();
  const associatePartner = useAssociatePartner();
  const dissociatePartner = useDissociatePartner();

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedPartnerId, setSelectedPartnerId] = useState("");
  const [notes, setNotes] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [partnerToRemove, setPartnerToRemove] = useState<{ id: string; name: string } | null>(null);

  // Filter out already associated partners
  const existingPartnerIds = contactPartners.map((cp) => cp.partner_id);
  const availablePartners = allPartners.filter((p) => !existingPartnerIds.includes(p.id));

  const handleAssociate = async () => {
    if (!selectedPartnerId) return;

    await associatePartner.mutateAsync({
      contactId,
      partnerId: selectedPartnerId,
      notes: notes || undefined,
    });

    setAddDialogOpen(false);
    setSelectedPartnerId("");
    setNotes("");
  };

  const handleRemove = (id: string, name: string) => {
    setPartnerToRemove({ id, name });
    setDeleteDialogOpen(true);
  };

  const confirmRemove = () => {
    if (partnerToRemove) {
      dissociatePartner.mutate({ id: partnerToRemove.id, contactId });
    }
    setDeleteDialogOpen(false);
    setPartnerToRemove(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Partenaires associés</h3>
        <Button size="sm" onClick={() => setAddDialogOpen(true)} disabled={availablePartners.length === 0}>
          <Plus className="h-4 w-4 mr-2" />
          Associer
        </Button>
      </div>

      {contactPartners.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Aucun partenaire associé"
          description="Associez des partenaires (assurance, comptable, médecin...) à ce contact."
          action={
            availablePartners.length > 0 ? (
              <Button size="sm" onClick={() => setAddDialogOpen(true)}>
                <LinkIcon className="h-4 w-4 mr-2" />
                Associer un partenaire
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {contactPartners.map(({ id, partner, notes }) => (
            <Card key={id} className="relative group">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-base">{partner.company_name}</CardTitle>
                    <Badge className={`mt-1 ${CATEGORY_COLORS[partner.category]}`}>
                      {CATEGORY_LABELS[partner.category]}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                    onClick={() => handleRemove(id, partner.company_name)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {partner.contact_name && (
                  <div className="text-muted-foreground">{partner.contact_name}</div>
                )}
                <div className="flex flex-col gap-1">
                  {partner.phone && (
                    <a href={`tel:${partner.phone}`} className="flex items-center gap-1 text-primary hover:underline">
                      <Phone className="h-3 w-3" />
                      {partner.phone}
                    </a>
                  )}
                  {partner.email && (
                    <a href={`mailto:${partner.email}`} className="flex items-center gap-1 text-primary hover:underline">
                      <Mail className="h-3 w-3" />
                      {partner.email}
                    </a>
                  )}
                </div>
                {notes && (
                  <div className="text-xs text-muted-foreground border-t pt-2 mt-2">
                    {notes}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Partner Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Associer un partenaire</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Partenaire</Label>
              <Select value={selectedPartnerId} onValueChange={setSelectedPartnerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un partenaire" />
                </SelectTrigger>
                <SelectContent>
                  {availablePartners.map((partner) => (
                    <SelectItem key={partner.id} value={partner.id}>
                      {partner.company_name} ({CATEGORY_LABELS[partner.category]})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes (optionnel)</Label>
              <Textarea
                placeholder="Notes sur cette association..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                Annuler
              </Button>
              <Button
                onClick={handleAssociate}
                disabled={!selectedPartnerId || associatePartner.isPending}
              >
                {associatePartner.isPending ? "Association..." : "Associer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retirer ce partenaire ?</AlertDialogTitle>
            <AlertDialogDescription>
              L'association avec "{partnerToRemove?.name}" sera supprimée. Le partenaire reste disponible pour d'autres contacts.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemove} className="bg-destructive text-destructive-foreground">
              Retirer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
