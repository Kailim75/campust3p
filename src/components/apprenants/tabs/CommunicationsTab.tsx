import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Mail, Phone, FileText, Calendar, Award, MessageCircle, Send, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

const TYPE_ICONS: Record<string, { icon: typeof Mail; color: string }> = {
  email: { icon: Mail, color: "bg-primary/10 text-primary" },
  appel: { icon: Phone, color: "bg-info/10 text-info" },
  note: { icon: FileText, color: "bg-muted text-muted-foreground" },
  sms: { icon: MessageCircle, color: "bg-accent/10 text-accent" },
};

interface CommunicationsTabProps {
  contactId: string;
  contactPrenom: string;
  contactNom: string;
  contactEmail: string | null;
  contactFormation: string | null;
}

// Email templates
const EMAIL_TEMPLATES: Record<string, { sujet: string; contenu: string }> = {
  bienvenue: {
    sujet: "Bienvenue chez T3P Campus, {prénom} !",
    contenu: "Bonjour {prénom},\n\nNous sommes ravis de vous accueillir dans notre centre de formation {formation}.\n\nN'hésitez pas à nous contacter pour toute question.\n\nCordialement,\nT3P Campus",
  },
  rappel_dossier: {
    sujet: "Rappel — Documents manquants",
    contenu: "Bonjour {prénom},\n\nNous vous rappelons que votre dossier est incomplet. Merci de nous transmettre les documents manquants dans les meilleurs délais.\n\n{documents_manquants}\n\nCordialement,\nT3P Campus",
  },
  convocation: {
    sujet: "Convocation — Session de formation",
    contenu: "Bonjour {prénom},\n\nVous êtes convoqué(e) pour votre session de formation {formation} le {date}.\n\nMerci de vous présenter 15 minutes avant le début.\n\nCordialement,\nT3P Campus",
  },
  felicitations: {
    sujet: "Félicitations, {prénom} ! 🎓",
    contenu: "Bonjour {prénom},\n\nToute l'équipe de T3P Campus vous félicite pour l'obtention de votre diplôme {formation} !\n\nNous vous souhaitons une excellente carrière.\n\nCordialement,\nT3P Campus",
  },
};

export function CommunicationsTab({ contactId, contactPrenom, contactNom, contactEmail, contactFormation }: CommunicationsTabProps) {
  const queryClient = useQueryClient();
  const [emailDialog, setEmailDialog] = useState<string | null>(null);
  const [emailForm, setEmailForm] = useState({ to: "", sujet: "", contenu: "" });

  const { data: historique, isLoading } = useQuery({
    queryKey: ["apprenant-communications", contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_historique")
        .select("*")
        .eq("contact_id", contactId)
        .order("date_echange", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
  });

  const sendCommunication = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("contact_historique").insert({
        contact_id: contactId,
        type: "email",
        titre: emailForm.sujet,
        contenu: emailForm.contenu,
        date_echange: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apprenant-communications", contactId] });
      toast.success("Communication enregistrée");
      setEmailDialog(null);
    },
    onError: () => toast.error("Erreur"),
  });

  const openTemplate = (templateKey: string) => {
    const template = EMAIL_TEMPLATES[templateKey];
    if (!template) return;
    const replacements: Record<string, string> = {
      "{prénom}": contactPrenom,
      "{formation}": contactFormation || "votre formation",
      "{date}": "à déterminer",
      "{documents_manquants}": "• Documents à fournir",
    };
    let sujet = template.sujet;
    let contenu = template.contenu;
    Object.entries(replacements).forEach(([k, v]) => {
      sujet = sujet.replace(new RegExp(k.replace(/[{}]/g, "\\$&"), "g"), v);
      contenu = contenu.replace(new RegExp(k.replace(/[{}]/g, "\\$&"), "g"), v);
    });
    setEmailForm({ to: contactEmail || "", sujet, contenu });
    setEmailDialog(templateKey);
  };

  if (isLoading) return <Skeleton className="h-[300px] rounded-xl" />;

  return (
    <div className="space-y-5">
      {/* Quick action buttons */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => openTemplate("bienvenue")} className="text-xs">
          ✉️ Email bienvenue
        </Button>
        <Button size="sm" variant="outline" onClick={() => openTemplate("rappel_dossier")} className="text-xs">
          📋 Rappel dossier
        </Button>
        <Button size="sm" variant="outline" onClick={() => openTemplate("convocation")} className="text-xs">
          📅 Convocation
        </Button>
        <Button size="sm" variant="outline" onClick={() => openTemplate("felicitations")} className="text-xs">
          🏆 Félicitations
        </Button>
      </div>

      {/* Timeline */}
      <ScrollArea className="h-[400px]">
        <div className="space-y-3">
          {(!historique || historique.length === 0) ? (
            <Card className="p-6 text-center text-muted-foreground">
              Aucune communication
            </Card>
          ) : (
            historique.map((h: any) => {
              const typeConfig = TYPE_ICONS[h.type] || TYPE_ICONS.note;
              const Icon = typeConfig.icon;
              return (
                <div key={h.id} className="flex gap-3 p-3 rounded-xl border bg-card hover:bg-muted/30 transition-colors">
                  <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", typeConfig.color)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground truncate">{h.titre}</p>
                      <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                        {formatDistanceToNow(parseISO(h.date_echange), { addSuffix: true, locale: fr })}
                      </span>
                    </div>
                    {h.contenu && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{h.contenu}</p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Email dialog */}
      <Dialog open={!!emailDialog} onOpenChange={(v) => !v && setEmailDialog(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Envoyer un email</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Destinataire</Label>
              <Input value={emailForm.to} onChange={(e) => setEmailForm((p) => ({ ...p, to: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Sujet</Label>
              <Input value={emailForm.sujet} onChange={(e) => setEmailForm((p) => ({ ...p, sujet: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Message</Label>
              <Textarea rows={6} value={emailForm.contenu} onChange={(e) => setEmailForm((p) => ({ ...p, contenu: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailDialog(null)}>Annuler</Button>
            <Button onClick={() => sendCommunication.mutate()} disabled={sendCommunication.isPending}>
              <Send className="h-3.5 w-3.5 mr-1" />
              {sendCommunication.isPending ? "Envoi..." : "Envoyer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
