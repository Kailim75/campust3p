import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Send, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface NewMessageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  centreId: string;
  onSuccess?: (threadId: string) => void;
}

export function NewMessageModal({ open, onOpenChange, centreId, onSuccess }: NewMessageModalProps) {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const queryClient = useQueryClient();

  const sendMessage = useMutation({
    mutationFn: async () => {
      if (!to.trim() || !subject.trim() || !body.trim()) {
        throw new Error("Tous les champs sont obligatoires");
      }

      const { data, error } = await supabase.functions.invoke("send-gmail-new", {
        body: { to: to.trim(), subject: subject.trim(), body: body.trim(), centreId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["crm-email-threads"] });
      toast.success("Message envoyé");
      resetForm();
      onOpenChange(false);
      if (data?.threadId) onSuccess?.(data.threadId);
    },
    onError: (e) => toast.error("Erreur: " + e.message),
  });

  const resetForm = () => {
    setTo("");
    setSubject("");
    setBody("");
  };

  const isValid = to.trim() && subject.trim() && body.trim();

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="text-base">Nouveau message</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="nm-to" className="text-xs text-muted-foreground">Destinataire</Label>
            <Input
              id="nm-to"
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="email@exemple.com"
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nm-subject" className="text-xs text-muted-foreground">Objet</Label>
            <Input
              id="nm-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Objet du message"
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nm-body" className="text-xs text-muted-foreground">Message</Label>
            <Textarea
              id="nm-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Rédigez votre message…"
              rows={6}
              className="resize-none text-sm"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { resetForm(); onOpenChange(false); }}
            disabled={sendMessage.isPending}
          >
            Annuler
          </Button>
          <Button
            size="sm"
            onClick={() => sendMessage.mutate()}
            disabled={!isValid || sendMessage.isPending}
          >
            {sendMessage.isPending ? (
              <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Envoi…</>
            ) : (
              <><Send className="h-3.5 w-3.5 mr-1.5" />Envoyer</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
