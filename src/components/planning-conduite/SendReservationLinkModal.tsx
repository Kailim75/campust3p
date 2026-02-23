import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  apprenantId: string;
  apprenantPrenom: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function SendReservationLinkModal({ apprenantId, apprenantPrenom, open, onOpenChange }: Props) {
  const [loading, setLoading] = useState(false);
  const [tokenUrl, setTokenUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (open && apprenantId) {
      fetchOrCreateToken();
    }
  }, [open, apprenantId]);

  const fetchOrCreateToken = async () => {
    setLoading(true);
    try {
      // Check existing active token
      const { data: existing } = await supabase
        .from("tokens_reservation")
        .select("token, date_expiration")
        .eq("apprenant_id", apprenantId)
        .eq("actif", true)
        .gt("date_expiration", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1);

      let token: string;
      if (existing && existing.length > 0) {
        token = existing[0].token;
      } else {
        const { data: newToken, error } = await supabase
          .from("tokens_reservation")
          .insert({ apprenant_id: apprenantId })
          .select("token")
          .single();
        if (error) throw error;
        token = newToken.token;
      }

      const baseUrl = window.location.origin;
      const url = `${baseUrl}/reserver/${token}`;
      setTokenUrl(url);
      setMessage(
        `Bonjour ${apprenantPrenom},\n\nVoici votre lien personnel pour réserver vos séances de conduite :\n\n${url}\n\nCe lien vous est personnel, ne le partagez pas.\nIl est valable 90 jours.\n\nÀ bientôt,\nL'équipe ÉCOLE T3P`
      );
    } catch {
      toast.error("Erreur lors de la génération du lien");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Message copié");
    } catch {
      toast.error("Impossible de copier");
    }
  };

  const handleMarkSent = () => {
    toast.success("Marqué comme envoyé");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            🔗 Lien de réservation
            <Badge variant="outline">{apprenantPrenom}</Badge>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Génération du lien...</div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Lien de réservation</p>
              <p className="text-sm font-mono break-all text-foreground">{tokenUrl}</p>
            </div>

            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={10}
              className="text-sm"
            />

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                {copied ? "Copié" : "Copier le message"}
              </Button>
              <Button onClick={handleMarkSent}>
                <Send className="h-4 w-4 mr-1" /> Marquer comme envoyé
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
