import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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

interface SyncDriveFlowButtonProps {
  contactId: string;
  contactName: string;
}

export function SyncDriveFlowButton({ contactId, contactName }: SyncDriveFlowButtonProps) {
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-driveflow", {
        body: { contact_id: contactId },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erreur inconnue");

      toast.success(`${contactName} envoyé vers Drive Flow`, {
        description: "L'apprenant a été synchronisé avec succès.",
      });
    } catch (err: any) {
      console.error("Sync error:", err);
      toast.error("Erreur de synchronisation", {
        description: err.message || "Impossible d'envoyer vers Drive Flow.",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={isSyncing}>
          {isSyncing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <ExternalLink className="h-4 w-4 mr-2" />
          )}
          Drive Flow
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Envoyer vers Drive Flow ?</AlertDialogTitle>
          <AlertDialogDescription>
            <strong>{contactName}</strong> sera créé comme élève sur la plateforme Drive Flow
            avec ses informations (nom, email, téléphone, formation).
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={handleSync} disabled={isSyncing}>
            {isSyncing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Confirmer l'envoi
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
