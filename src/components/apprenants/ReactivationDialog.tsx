import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, RotateCcw, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { createAutoNote } from "@/lib/aujourdhui-actions";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { getStatutApprenantLabel, type StatutApprenant } from "@/lib/apprenant-active";

interface ReactivationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: {
    id: string;
    prenom: string;
    nom: string;
    statut_apprenant: StatutApprenant;
  };
  /** Called after successful reactivation */
  onReactivated: () => void;
}

export function ReactivationDialog({
  open,
  onOpenChange,
  contact,
  onReactivated,
}: ReactivationDialogProps) {
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleReactivate = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("contacts")
        .update({ statut_apprenant: "actif" as any })
        .eq("id", contact.id);

      if (error) throw error;

      await createAutoNote(
        contact.id,
        "apprenant_reactive",
        `Ancien statut: ${getStatutApprenantLabel(contact.statut_apprenant)}`
      );

      toast.success(`${contact.prenom} ${contact.nom} réactivé avec succès`);
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["aujourdhui-inbox"] });
      onOpenChange(false);
      onReactivated();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la réactivation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            Apprenant terminé
          </DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">
              {contact.prenom} {contact.nom}
            </span>{" "}
            est actuellement marqué comme{" "}
            <Badge variant="outline" className="text-[10px] mx-0.5">
              {getStatutApprenantLabel(contact.statut_apprenant)}
            </Badge>
            . Voulez-vous le réactiver pour cette inscription ?
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            Annuler
          </Button>
          <Button
            className="flex-1 gap-1.5"
            onClick={handleReactivate}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4" />
            )}
            Réactiver
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
