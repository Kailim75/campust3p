import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Mail, Loader2, CheckCircle2 } from "lucide-react";
import { useCentreContext } from "@/contexts/CentreContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import type { Json } from "@/integrations/supabase/types";

const DEFAULT_FROM = "Ecole T3P Montrouge <montrouge@ecolet3p.fr>";
const DEFAULT_REPLY_TO = "montrouge@ecolet3p.fr";

export function EmailSenderSettings() {
  const { currentCentre, centreId } = useCentreContext();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const settings = (currentCentre?.settings ?? {}) as Record<string, unknown>;

  const [fromAddress, setFromAddress] = useState("");
  const [replyTo, setReplyTo] = useState("");

  useEffect(() => {
    setFromAddress(
      typeof settings.email_from_address === "string" ? settings.email_from_address : ""
    );
    setReplyTo(
      typeof settings.email_reply_to === "string" ? settings.email_reply_to : ""
    );
  }, [currentCentre?.id]);

  const handleSave = async () => {
    if (!centreId) return;
    setSaving(true);
    try {
      const updatedSettings: Record<string, unknown> = {
        ...settings,
        email_from_address: fromAddress.trim() || null,
        email_reply_to: replyTo.trim() || null,
      };

      const { error } = await supabase
        .from("centres")
        .update({ settings: updatedSettings as unknown as Json })
        .eq("id", centreId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["user-centre"] });
      queryClient.invalidateQueries({ queryKey: ["centres"] });
      toast.success("Configuration email sauvegardée");
    } catch (e: any) {
      toast.error("Erreur : " + (e.message || "Sauvegarde échouée"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Mail className="h-4 w-4" />
          Expéditeur email
        </CardTitle>
        <CardDescription>
          Personnalisez l'adresse d'expédition des emails envoyés depuis le CRM.
          Si non renseigné, la valeur par défaut sera utilisée.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email-from" className="text-sm">
            Adresse expéditeur (From)
          </Label>
          <Input
            id="email-from"
            value={fromAddress}
            onChange={(e) => setFromAddress(e.target.value)}
            placeholder={DEFAULT_FROM}
          />
          <p className="text-xs text-muted-foreground">
            Format : Nom Affiché &lt;email@domaine.fr&gt;
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email-reply-to" className="text-sm">
            Adresse de réponse (Reply-To)
          </Label>
          <Input
            id="email-reply-to"
            type="email"
            value={replyTo}
            onChange={(e) => setReplyTo(e.target.value)}
            placeholder={DEFAULT_REPLY_TO}
          />
        </div>

        <Button onClick={handleSave} disabled={saving} size="sm">
          {saving ? (
            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4 mr-1.5" />
          )}
          Enregistrer
        </Button>
      </CardContent>
    </Card>
  );
}
