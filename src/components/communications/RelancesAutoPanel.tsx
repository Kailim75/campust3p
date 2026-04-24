import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Mail, Clock, Hash, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCentreContext } from "@/contexts/CentreContext";
import { useEmailTemplates } from "@/hooks/useEmailTemplates";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export function RelancesAutoPanel() {
  const { currentCentre } = useCentreContext();
  const centreId = currentCentre?.id;
  const queryClient = useQueryClient();
  const { data: templates = [] } = useEmailTemplates();

  const paiementTemplates = templates.filter(
    (t) => t.categorie === "paiement" && t.actif
  );

  const { data: config, isLoading } = useQuery({
    queryKey: ["relance-paiement-config", centreId],
    queryFn: async () => {
      if (!centreId) return null;
      const { data } = await supabase
        .from("relance_paiement_config")
        .select("*")
        .eq("centre_id", centreId)
        .maybeSingle();
      return data;
    },
    enabled: !!centreId,
  });

  const { data: pendingCount = 0 } = useQuery({
    queryKey: ["relance-queue-pending", centreId],
    queryFn: async () => {
      if (!centreId) return 0;
      const { count } = await supabase
        .from("relance_paiement_queue")
        .select("id", { count: "exact", head: true })
        .eq("centre_id", centreId)
        .eq("statut", "pending");
      return count ?? 0;
    },
    enabled: !!centreId,
  });

  const [actif, setActif] = useState(true);
  const [intervalle, setIntervalle] = useState(7);
  const [maxRelances, setMaxRelances] = useState(3);
  const [delaiPremiere, setDelaiPremiere] = useState(0);
  const [templateId, setTemplateId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (config) {
      setActif(config.actif);
      setIntervalle(config.intervalle_jours);
      setMaxRelances(config.nb_relances_max);
      setDelaiPremiere(config.delai_premiere_relance_jours);
      setTemplateId(config.template_email_id ?? "");
    } else {
      // Default: pick "Relance paiement - Process officiel"
      const def = paiementTemplates.find(
        (t) => t.nom === "Relance paiement - Process officiel"
      );
      if (def) setTemplateId(def.id);
    }
  }, [config, paiementTemplates.length]);

  const handleSave = async () => {
    if (!centreId) return;
    setSaving(true);
    const payload = {
      centre_id: centreId,
      actif,
      intervalle_jours: intervalle,
      nb_relances_max: maxRelances,
      delai_premiere_relance_jours: delaiPremiere,
      template_email_id: templateId || null,
    };

    const { error } = config
      ? await supabase
          .from("relance_paiement_config")
          .update(payload)
          .eq("id", config.id)
      : await supabase.from("relance_paiement_config").insert(payload);

    setSaving(false);
    if (error) {
      toast.error("Erreur lors de l'enregistrement");
      console.error(error);
    } else {
      toast.success("Configuration enregistrée");
      queryClient.invalidateQueries({ queryKey: ["relance-paiement-config", centreId] });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                Relances automatiques de paiement
              </CardTitle>
              <CardDescription>
                Envoi automatique d'emails quand une facture passe de payée à partielle ou impayée
              </CardDescription>
            </div>
            <Badge variant={pendingCount > 0 ? "default" : "secondary"}>
              {pendingCount} en attente
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
            <div>
              <Label htmlFor="actif" className="font-medium">Activer le système</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Désactivé : aucune relance ne sera envoyée automatiquement
              </p>
            </div>
            <Switch id="actif" checked={actif} onCheckedChange={setActif} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="delai" className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" /> Délai 1ère relance (jours)
              </Label>
              <Input
                id="delai" type="number" min={0} max={30}
                value={delaiPremiere}
                onChange={(e) => setDelaiPremiere(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">0 = immédiat</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="intervalle" className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" /> Intervalle (jours)
              </Label>
              <Input
                id="intervalle" type="number" min={1} max={90}
                value={intervalle}
                onChange={(e) => setIntervalle(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">Entre chaque relance</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max" className="flex items-center gap-1.5">
                <Hash className="h-3.5 w-3.5" /> Nombre max
              </Label>
              <Input
                id="max" type="number" min={1} max={10}
                value={maxRelances}
                onChange={(e) => setMaxRelances(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">Total de relances</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Modèle d'email à utiliser</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un modèle..." />
              </SelectTrigger>
              <SelectContent>
                {paiementTemplates.length === 0 ? (
                  <div className="px-2 py-3 text-xs text-muted-foreground">
                    Aucun modèle "paiement" actif
                  </div>
                ) : (
                  paiementTemplates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.nom}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Variables disponibles : civilite, nom, formation, numero_facture, montant_du, date_echeance, jours_retard, lien_recapitulatif
            </p>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-info/10 border border-info/20">
            <AlertCircle className="h-4 w-4 text-info mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              Les relances en attente sont automatiquement <strong>annulées</strong> si la facture
              redevient payée. Le système vérifie les envois <strong>chaque heure</strong>.
            </p>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Enregistrer la configuration
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
