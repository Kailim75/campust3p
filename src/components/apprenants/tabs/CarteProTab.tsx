import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CreditCard, CheckCircle2, Clock, AlertCircle, Save, Edit, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface CarteProTabProps {
  contactId: string;
  contactPrenom: string;
  formation: string | null;
}

export function CarteProTab({ contactId, contactPrenom, formation }: CarteProTabProps) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    numero_carte: "",
    prefecture: "",
    date_obtention: "",
    date_expiration: "",
  });

  const { data: cartePro, isLoading } = useQuery({
    queryKey: ["carte-pro", contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cartes_professionnelles")
        .select("*")
        .eq("contact_id", contactId)
        .order("created_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      return data?.[0] || null;
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (values: typeof formData) => {
      if (cartePro) {
        const { error } = await supabase
          .from("cartes_professionnelles")
          .update({
            numero_carte: values.numero_carte || null,
            prefecture: values.prefecture || null,
            date_obtention: values.date_obtention || null,
            date_expiration: values.date_expiration || null,
          })
          .eq("id", cartePro.id);
        if (error) throw error;
      } else {
        const typeCarte = formation?.toLowerCase().includes("taxi") ? "taxi" : "vtc";
        const { error } = await supabase
          .from("cartes_professionnelles")
          .insert({
            contact_id: contactId,
            type_carte: typeCarte,
            formation_type: formation,
            numero_carte: values.numero_carte || null,
            prefecture: values.prefecture || null,
            date_obtention: values.date_obtention || null,
            date_expiration: values.date_expiration || null,
            statut: values.numero_carte ? "obtenue" : "en_attente",
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["carte-pro", contactId] });
      setEditing(false);
      toast.success("Carte professionnelle mise à jour");
    },
    onError: () => toast.error("Erreur lors de la sauvegarde"),
  });

  const startEdit = () => {
    setFormData({
      numero_carte: cartePro?.numero_carte || "",
      prefecture: cartePro?.prefecture || "",
      date_obtention: cartePro?.date_obtention || "",
      date_expiration: cartePro?.date_expiration || "",
    });
    setEditing(true);
  };

  if (isLoading) {
    return <div className="space-y-3"><Skeleton className="h-32 w-full" /><Skeleton className="h-20 w-full" /></div>;
  }

  const hasCard = !!cartePro?.numero_carte;
  const isExpired = cartePro?.date_expiration && new Date(cartePro.date_expiration) < new Date();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-accent" />
          Carte Professionnelle
        </h3>
        {!editing && (
          <Button size="sm" variant="outline" onClick={startEdit}>
            <Edit className="h-3 w-3 mr-1" /> {hasCard ? "Modifier" : "Renseigner"}
          </Button>
        )}
      </div>

      {editing ? (
        <Card className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">N° Carte</Label>
              <Input
                value={formData.numero_carte}
                onChange={e => setFormData(p => ({ ...p, numero_carte: e.target.value }))}
                placeholder="T-75-2024-XXXXX"
                className="text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Préfecture / Département</Label>
              <Input
                value={formData.prefecture}
                onChange={e => setFormData(p => ({ ...p, prefecture: e.target.value }))}
                placeholder="Paris (75)"
                className="text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Date d'obtention</Label>
              <Input
                type="date"
                value={formData.date_obtention}
                onChange={e => setFormData(p => ({ ...p, date_obtention: e.target.value }))}
                className="text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Date d'expiration</Label>
              <Input
                type="date"
                value={formData.date_expiration}
                onChange={e => setFormData(p => ({ ...p, date_expiration: e.target.value }))}
                className="text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              <X className="h-3 w-3 mr-1" /> Annuler
            </Button>
            <Button size="sm" onClick={() => upsertMutation.mutate(formData)} disabled={upsertMutation.isPending}>
              <Save className="h-3 w-3 mr-1" /> Enregistrer
            </Button>
          </div>
        </Card>
      ) : hasCard ? (
        <Card className="p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Badge className={cn("text-xs", isExpired ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success")}>
              {isExpired ? <><AlertCircle className="h-3 w-3 mr-1" /> Expirée</> : <><CheckCircle2 className="h-3 w-3 mr-1" /> Valide</>}
            </Badge>
            <span className="text-sm font-mono font-semibold">{cartePro.numero_carte}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            {cartePro.prefecture && (
              <div><span className="font-medium">Préfecture :</span> {cartePro.prefecture}</div>
            )}
            {cartePro.date_obtention && (
              <div><span className="font-medium">Obtenue le :</span> {format(new Date(cartePro.date_obtention), "dd/MM/yyyy", { locale: fr })}</div>
            )}
            {cartePro.date_expiration && (
              <div><span className="font-medium">Expire le :</span> {format(new Date(cartePro.date_expiration), "dd/MM/yyyy", { locale: fr })}</div>
            )}
          </div>
        </Card>
      ) : (
        <Card className="p-6 text-center space-y-2">
          <Clock className="h-8 w-8 mx-auto text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">Aucune carte professionnelle renseignée</p>
          <p className="text-xs text-muted-foreground">En formation continue, la carte pro existante est requise.</p>
        </Card>
      )}
    </div>
  );
}
